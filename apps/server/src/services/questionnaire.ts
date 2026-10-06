/** Questionnaire rules – owner: Adam. Same logic as apps/mobile/src/utils/questionnaire.ts. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Option {
  value: string;
  label: string;
  description?: string | null;
  image?: string | null;
}
export interface Question {
  id: string;
  type: 'single' | 'multi' | 'scale' | 'text' | 'boolean';
  title: string;
  help?: string | null;
  required?: boolean;
  options?: Option[];
  min?: number;
  max?: number;
  show_if?: { question_id: string; equals?: unknown; includes?: string; gte?: number } | null;
  layout?: string;
  context?: string;
  note?: string;
}
export interface Questionnaire {
  version: string;
  title: string;
  questions: Question[];
}

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/services → ../../src/data in production, src/services → ../data in dev
const candidates = [path.join(here, '..', 'data', 'questionnaire_v1.json'), path.join(here, '..', '..', 'src', 'data', 'questionnaire_v1.json')];

let cached: Questionnaire | null = null;
export function loadQuestionnaire(): Questionnaire {
  if (cached) return cached;
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Questionnaire;
      raw.questions = raw.questions.map((q) => ({ ...q, required: q.required !== false, options: q.options ?? [] }));
      cached = raw;
      return raw;
    }
  }
  throw new Error('questionnaire_v1.json not found');
}

export function isVisible(q: Question, answers: Record<string, unknown>): boolean {
  const c = q.show_if;
  if (!c) return true;
  const v = answers[c.question_id];
  if (c.equals !== undefined && c.equals !== null) return v === c.equals;
  if (c.includes !== undefined && c.includes !== null) return Array.isArray(v) && v.includes(c.includes);
  if (c.gte !== undefined && c.gte !== null) return typeof v === 'number' && v >= c.gte;
  return true;
}

export function validateAnswers(q: Questionnaire, answers: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const question of q.questions) {
    if (!isVisible(question, answers)) continue;
    const v = answers[question.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (question.required !== false) errors.push(`Frågan "${question.title}" saknar svar`);
      continue;
    }
    const allowed = new Set((question.options ?? []).map((o) => o.value));
    if (question.type === 'single' && !allowed.has(String(v))) errors.push(`Ogiltigt svar på ${question.id}`);
    if (question.type === 'multi' && (!Array.isArray(v) || v.some((x) => !allowed.has(String(x))))) errors.push(`Ogiltigt svar på ${question.id}`);
    if (question.type === 'boolean' && typeof v !== 'boolean') errors.push(`${question.id} måste vara ja/nej`);
    if (question.type === 'scale' && !(typeof v === 'number' && v >= (question.min ?? 0) && v <= (question.max ?? 10))) errors.push(`${question.id} är utanför skalan`);
    if (question.type === 'text' && (typeof v !== 'string' || v.length > 1000)) errors.push(`${question.id} är för långt`);
  }
  return errors;
}

export function answersAsText(q: Questionnaire, answers: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const question of q.questions) {
    if (!isVisible(question, answers)) continue;
    const v = answers[question.id];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    const labels = new Map((question.options ?? []).map((o) => [o.value, o.label]));
    const text = Array.isArray(v) ? v.map((x) => labels.get(String(x)) ?? x).join(', ') : typeof v === 'boolean' ? (v ? 'Ja' : 'Nej') : labels.get(String(v)) ?? String(v);
    lines.push(`- ${question.title} → ${text}`);
  }
  return lines.join('\n') || '- (inga svar)';
}
