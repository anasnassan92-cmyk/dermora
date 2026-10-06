/**
 * Assessment / questionnaire service – owner: Adam.
 */
import { USE_MOCK_API } from '../../../constants';
import { api } from '../../../services/api/client';
import { mockAssessment, mockQuestionnaire } from '../../../services/mock/mockData';
import type { Answers, Assessment, Questionnaire } from '../../../types/api';

const mockStore = new Map<string, Assessment>();

export const assessmentService = {
  async getQuestionnaire(): Promise<Questionnaire> {
    if (USE_MOCK_API) return mockQuestionnaire;
    return api.get<Questionnaire>('/questionnaire');
  },

  async create(): Promise<Assessment> {
    if (USE_MOCK_API) {
      const a = mockAssessment(`mock-${Date.now()}`);
      mockStore.set(a.id, a);
      return a;
    }
    return api.post<Assessment>('/assessments', { questionnaire_version: '1.0.0' });
  },

  async list(): Promise<Assessment[]> {
    if (USE_MOCK_API) return [...mockStore.values()].reverse();
    return api.get<Assessment[]>('/assessments');
  },

  async get(id: string): Promise<Assessment> {
    if (USE_MOCK_API) {
      const a = mockStore.get(id);
      if (!a) throw new Error('Bedömningen finns inte');
      return a;
    }
    return api.get<Assessment>(`/assessments/${id}`);
  },

  async saveAnswers(id: string, answers: Answers): Promise<Assessment> {
    if (USE_MOCK_API) {
      const a = await this.get(id);
      const next = { ...a, answers: { ...a.answers, ...answers } };
      mockStore.set(id, next);
      return next;
    }
    return api.put<Assessment>(`/assessments/${id}/answers`, { answers });
  },

  async submit(id: string): Promise<Assessment> {
    if (USE_MOCK_API) {
      const a = await this.get(id);
      const next: Assessment = { ...a, status: 'submitted', submitted_at: new Date().toISOString() };
      mockStore.set(id, next);
      return next;
    }
    return api.post<Assessment>(`/assessments/${id}/submit`);
  },
};
