/**
 * AI guidance service – owner: Youssef.
 * Chat replies stream over server-sent events (POST /ai/chat/:id/stream) with a non-streaming
 * fallback; every assistant message carries follow-up suggestions and can be rated.
 */
import { Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';

import { API_URL, USE_MOCK_API } from '../../constants';
import type { AnalyzeResult, ChatMessage, ChatStatus } from '../../types/api';
import { api, authToken } from '../api/client';
import { mockChatReply, mockGuidance } from '../mock/mockData';

const mockChats = new Map<string, ChatMessage[]>();
const mockResults = new Map<string, AnalyzeResult>();

const PREVIEW = typeof window !== 'undefined' && !!window.location && new URLSearchParams(window.location.search).has('preview');
const wait = (ms: number) => new Promise((r) => setTimeout(r, PREVIEW ? 0 : ms));
const MOCK_SUGGESTIONS = ['Hur länge tar det innan jag ser resultat?', 'Vad ska jag undvika att kombinera?', 'När bör jag kontakta vården?'];

export interface SendOptions {
  imageId?: string | null;
  /** Called with the text so far while the reply streams in. */
  onDelta?: (text: string) => void;
}

/** Streaming fetch: expo/fetch supports response streaming on iOS/Android; the browser's fetch does on web. */
function streamingFetch(url: string, init: RequestInit): Promise<Response> {
  return Platform.OS === 'web' ? fetch(url, init) : (expoFetch(url, init as never) as unknown as Promise<Response>);
}

async function sendStreaming(assessmentId: string, content: string, opts: SendOptions): Promise<ChatMessage | null> {
  const token = await authToken();
  const res = await streamingFetch(`${API_URL}/ai/chat/${assessmentId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ content, image_id: opts.imageId ?? undefined }),
  });
  if (!res.ok || !res.body) {
    if (res.status >= 400 && res.status !== 500) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Fel ${res.status}`);
    }
    return null; // let the caller fall back to the plain endpoint
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let done: ChatMessage | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.+)$/m.exec(frame)?.[1];
      const data = /^data: (.+)$/m.exec(frame)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === 'delta') {
        text += payload.text;
        opts.onDelta?.(text);
      } else if (event === 'done') done = payload as ChatMessage;
      else if (event === 'error') throw new Error(payload.detail ?? 'AI-chatten svarar inte just nu.');
    }
  }
  return done;
}

export const aiService = {
  async analyze(assessmentId: string): Promise<AnalyzeResult> {
    if (USE_MOCK_API) {
      await wait(1200); // feels like a real analysis in demos
      const result: AnalyzeResult = { assessment_id: assessmentId, provider: 'mock', model: 'mock-v1', result: mockGuidance };
      mockResults.set(assessmentId, result);
      mockChats.set(assessmentId, [{ id: 1, role: 'assistant', content: mockGuidance.guidance, suggestions: MOCK_SUGGESTIONS }]);
      return result;
    }
    return api.post<AnalyzeResult>(`/ai/analyze/${assessmentId}`);
  },

  async latestResult(assessmentId: string): Promise<AnalyzeResult | null> {
    if (USE_MOCK_API) return mockResults.get(assessmentId) ?? null;
    return api.get<AnalyzeResult | null>(`/ai/result/${assessmentId}`);
  },

  async history(assessmentId: string): Promise<ChatMessage[]> {
    if (USE_MOCK_API) return mockChats.get(assessmentId) ?? [];
    return api.get<ChatMessage[]>(`/ai/chat/${assessmentId}`);
  },

  async status(assessmentId: string): Promise<ChatStatus> {
    if (USE_MOCK_API) return { checkin_due: false, days_on_plan: 0, follow_up_days: 14, adherence_14d: 0, streak: 0 };
    return api.get<ChatStatus>(`/ai/chat/${assessmentId}/status`);
  },

  /** Sends a message; streams the reply when the platform allows it, otherwise waits for the full reply. */
  async send(assessmentId: string, content: string, opts: SendOptions = {}): Promise<ChatMessage> {
    if (USE_MOCK_API) {
      const list = mockChats.get(assessmentId) ?? [];
      list.push({ id: list.length + 1, role: 'user', content, image_id: opts.imageId ?? null });
      const full = (opts.imageId ? 'Tack för bilden! ' : '') + mockChatReply(content);
      let shown = '';
      for (const piece of full.match(/.{1,20}/gs) ?? []) {
        shown += piece;
        opts.onDelta?.(shown);
        await wait(25);
      }
      const reply: ChatMessage = { id: list.length + 1, role: 'assistant', content: full, suggestions: MOCK_SUGGESTIONS, created_at: new Date().toISOString() };
      list.push(reply);
      mockChats.set(assessmentId, list);
      return reply;
    }
    try {
      const streamed = await sendStreaming(assessmentId, content, opts);
      if (streamed) return streamed;
    } catch (e) {
      if ((e as Error).message && !/network|stream|body|TypeError/i.test(String(e))) throw e;
    }
    return api.post<ChatMessage>(`/ai/chat/${assessmentId}`, { content, image_id: opts.imageId ?? undefined });
  },

  async rate(assessmentId: string, messageId: string | number, rating: 1 | -1 | 0, comment?: string): Promise<void> {
    if (USE_MOCK_API) {
      const m = (mockChats.get(assessmentId) ?? []).find((x) => String(x.id) === String(messageId));
      if (m) m.rating = rating || null;
      return;
    }
    await api.post(`/ai/chat/${assessmentId}/feedback`, { message_id: String(messageId), rating, comment });
  },
};
