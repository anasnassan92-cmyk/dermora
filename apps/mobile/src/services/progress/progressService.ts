/**
 * "Framsteg" – routine log (morning/evening done per day), adherence, streak and progress photos.
 * Owner: Even. Mock mode keeps everything in memory so the tab works in demos and previews.
 */
import { USE_MOCK_API } from '../../constants';
import type { ProgressData, RoutineSlot } from '../../types/api';
import { api } from '../api/client';
import { mockGuidance, mockPlanFromGuidance } from '../mock/mockData';

const mockPlan = { ...mockPlanFromGuidance(mockGuidance, 'mock-assessment-1'), status: 'confirmed' as const, confirmed_at: new Date(Date.now() - 9 * 86_400_000).toISOString() };

const mockLogs = new Map<string, boolean>(); // `${day}:${slot}`

export function dayKey(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function mockData(): ProgressData {
  const logs = [...mockLogs.entries()].filter(([, v]) => v).map(([k]) => ({ day: k.split(':')[0], slot: k.split(':')[1] as RoutineSlot, done: 1, note: null }));
  const days = new Set(logs.map((l) => l.day));
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const k = dayKey(new Date(Date.now() - i * 86_400_000));
    if (!days.has(k)) {
      if (i === 0) continue;
      break;
    }
    streak++;
  }
  return { plan: mockPlan, days_on_plan: 9, follow_up_days: 14, checkin_due: false, adherence_14d: Math.min(100, Math.round((logs.length / 28) * 100)), streak, logs, photos: [] };
}

export const progressService = {
  async get(): Promise<ProgressData> {
    if (USE_MOCK_API) return mockData();
    return api.get<ProgressData>('/progress');
  },

  async log(day: string, slot: RoutineSlot, done: boolean): Promise<void> {
    if (USE_MOCK_API) {
      mockLogs.set(`${day}:${slot}`, done);
      return;
    }
    await api.post('/progress/log', { day, slot, done });
  },
};
