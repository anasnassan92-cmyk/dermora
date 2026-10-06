/**
 * Treatment plan service – owner: Even.
 */
import { USE_MOCK_API } from '../../../constants';
import { api } from '../../../services/api/client';
import { mockGuidance, mockPlanFromGuidance } from '../../../services/mock/mockData';
import type { TreatmentPlan, TreatmentPlanProposal } from '../../../types/api';

const mockPlans: TreatmentPlan[] = [];

export const planService = {
  async proposeFromAssessment(assessmentId: string): Promise<TreatmentPlan> {
    if (USE_MOCK_API) {
      const p = mockPlanFromGuidance(mockGuidance, assessmentId);
      mockPlans.unshift(p);
      return p;
    }
    return api.post<TreatmentPlan>(`/plans/from-assessment/${assessmentId}`);
  },

  async create(plan: TreatmentPlanProposal, assessmentId: string | null): Promise<TreatmentPlan> {
    if (USE_MOCK_API) {
      const p = { ...mockPlanFromGuidance({ ...mockGuidance, plan }, assessmentId), title: plan.title, summary: plan.summary };
      mockPlans.unshift(p);
      return p;
    }
    return api.post<TreatmentPlan>('/plans', { assessment_id: assessmentId, plan });
  },

  async confirm(planId: string): Promise<TreatmentPlan> {
    if (USE_MOCK_API) {
      mockPlans.forEach((p) => {
        if (p.status === 'confirmed') p.status = 'archived';
      });
      const p = mockPlans.find((x) => x.id === planId);
      if (!p) throw new Error('Planen finns inte');
      p.status = 'confirmed';
      p.confirmed_at = new Date().toISOString();
      return p;
    }
    return api.post<TreatmentPlan>(`/plans/${planId}/confirm`);
  },

  async active(): Promise<TreatmentPlan | null> {
    if (USE_MOCK_API) return mockPlans.find((p) => p.status === 'confirmed') ?? null;
    return api.get<TreatmentPlan | null>('/plans/active');
  },

  async list(): Promise<TreatmentPlan[]> {
    if (USE_MOCK_API) return mockPlans;
    return api.get<TreatmentPlan[]>('/plans');
  },

  async archive(planId: string): Promise<TreatmentPlan> {
    if (USE_MOCK_API) {
      const p = mockPlans.find((x) => x.id === planId)!;
      p.status = 'archived';
      return p;
    }
    return api.post<TreatmentPlan>(`/plans/${planId}/archive`);
  },
};
