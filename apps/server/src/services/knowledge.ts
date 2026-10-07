/**
 * Knowledge base for the chatbot (RAG without an embedding service).
 * Swedish dermatology notes live in src/data/knowledge/*.md; every "## " heading is a chunk.
 * Retrieval is BM25 over a light Swedish normaliser, so it runs offline, deterministically and
 * in tests. The chunks are injected into the Gemini prompt and the ids are stored as "sources".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Chunk {
  id: string; // file#slug
  file: string;
  title: string;
  text: string;
  terms: string[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
const DIRS = [path.join(here, '..', 'data', 'knowledge'), path.join(here, '..', '..', 'src', 'data', 'knowledge')];

const STOP = new Set(
  'och att det är en ett i på för med som av till den de om inte har kan ska vid eller men från så du dig din ditt dina jag vi man sig sin sitt sina än mer mest här där när hur vad vilka vilken också bara även utan över under efter innan mellan samma varje alla all allt andra annan annat detta dessa den det denna ofta ibland sällan aldrig alltid gärna'
    .split(' '),
);

/** Lowercase, strip punctuation, drop stop words, crude Swedish stemming. */
export function normalise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9åäöéü\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem);
}

function stem(w: string): string {
  for (const suf of ['iteterna', 'iteten', 'iteter', 'itet', 'ningarna', 'ningar', 'heterna', 'heten', 'erna', 'arna', 'orna', 'ning', 'ande', 'ende', 'het', 'ade', 'are', 'ast', 'na', 'en', 'et', 'er', 'ar', 'or', 'an', 'a', 'e', 's']) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

let chunks: Chunk[] = [];
let df = new Map<string, number>();
let avgLen = 1;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9åäö]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function loadKnowledge(): Chunk[] {
  const dir = DIRS.find((d) => fs.existsSync(d));
  const out: Chunk[] = [];
  if (dir) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const md = fs.readFileSync(path.join(dir, file), 'utf8');
      const name = file.replace(/\.md$/, '');
      const parts = md.split(/^## /m).slice(1); // skip the "# title" preamble
      for (const part of parts) {
        const nl = part.indexOf('\n');
        const title = part.slice(0, nl).trim();
        const text = part.slice(nl + 1).trim();
        if (!text) continue;
        out.push({ id: `${name}#${slug(title)}`, file: name, title, text, terms: normalise(`${title} ${title} ${text}`) });
      }
    }
  }
  chunks = out;
  df = new Map();
  for (const c of chunks) for (const t of new Set(c.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  avgLen = chunks.reduce((s, c) => s + c.terms.length, 0) / Math.max(1, chunks.length);
  return chunks;
}

export function knowledgeSize(): number {
  if (!chunks.length) loadKnowledge();
  return chunks.length;
}

/** BM25 (k1=1.5, b=0.75). Returns the best chunks with a score > 0. */
export function retrieve(query: string, k = 4): (Chunk & { score: number })[] {
  if (!chunks.length) loadKnowledge();
  const q = normalise(query);
  if (!q.length) return [];
  const N = chunks.length;
  const scored = chunks.map((c) => {
    const tf = new Map<string, number>();
    for (const t of c.terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of new Set(q)) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * 2.5) / (f + 1.5 * (0.25 + 0.75 * (c.terms.length / avgLen))));
    }
    return { ...c, score };
  });
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Markdown block for the prompt. */
export function knowledgeBlock(query: string, k = 4): { text: string; sources: string[] } {
  const hits = retrieve(query, k);
  if (!hits.length) return { text: '', sources: [] };
  return {
    text: hits.map((h) => `### ${h.title} (${h.id})\n${h.text}`).join('\n\n'),
    sources: hits.map((h) => h.id),
  };
}
