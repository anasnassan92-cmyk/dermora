/**
 * AI guidance service – owner: Youssef.
 */
import { USE_MOCK_API } from '../../constants';
import type { AnalyzeResult, ChatMessage } from '../../types/api';
import { api } from '../api/client';
import { mockChatReply, mockGuidance } from '../mock/mockData';

const mockChats = new Map<string, ChatMessage[]>();
const mockResults = new Map<string, AnalyzeResult>();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const aiService = {
  async analyze(assessmentId: string): Promise<AnalyzeResult> {
    if (USE_MOCK_API) {
      await wait(1200); // feels like a real analysis in demos
      const result: AnalyzeResult = { assessment_id: assessmentId, provider: 'mock', model: 'mock-v1', result: mockGuidance };
      mockResults.set(assessmentId, result);
      mockChats.set(assessmentId, [{ id: 1, role: 'assistant', content: mockGuidance.guidance }]);
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

  async send(assessmentId: string, content: string): Promise<ChatMessage> {
    if (USE_MOCK_API) {
      await wait(600);
      const list = mockChats.get(assessmentId) ?? [];
      list.push({ id: list.length + 1, role: 'user', content });
      const reply: ChatMessage = { id: list.length + 1, role: 'assistant', content: mockChatReply(content) };
      list.push(reply);
      mockChats.set(assessmentId, list);
      return reply;
    }
    return api.post<ChatMessage>(`/ai/chat/${assessmentId}`, { content });
  },
};
