/** Row → API shape helpers shared by the routes and the admin panel. Owner: Assad. */
import { getDb, parseJson } from './index.js';

export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  birth_year: number | null;
  age_range: string | null;
  gender: string | null;
  country: string | null;
  skin_tone: number | null;
  skin_type: string | null;
  consent_images: number;
  consent_at: string | null;
  locale: string | null;
  updated_at: string;
}

export function profileOut(p: ProfileRow) {
  return {
    id: p.user_id,
    display_name: p.display_name,
    birth_year: p.birth_year === null ? null : Number(p.birth_year),
    age_range: p.age_range,
    gender: p.gender,
    country: p.country ?? 'SE',
    skin_tone: p.skin_tone === null ? null : Number(p.skin_tone),
    skin_type: p.skin_type ?? 'unknown',
    consent_images: !!Number(p.consent_images),
    consent_at: p.consent_at,
    locale: p.locale ?? 'sv',
  };
}

export interface AssessmentRow {
  id: string;
  user_id: string;
  questionnaire_version: string;
  status: string;
  answers: string | null;
  created_at: string;
  submitted_at: string | null;
  analyzed_at: string | null;
}

export async function assessmentOut(a: AssessmentRow) {
  const imgs = await getDb().all<{ id: string }>('SELECT id FROM skin_images WHERE assessment_id = ? ORDER BY created_at', [a.id]);
  return {
    id: a.id,
    user_id: a.user_id,
    questionnaire_version: a.questionnaire_version,
    status: a.status,
    answers: parseJson<Record<string, unknown>>(a.answers, {}),
    image_ids: imgs.map((i) => i.id),
    created_at: a.created_at,
    submitted_at: a.submitted_at,
    analyzed_at: a.analyzed_at,
  };
}

export interface PlanRow {
  id: string;
  user_id: string;
  assessment_id: string | null;
  status: string;
  title: string;
  summary: string | null;
  plan: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function planOut(p: PlanRow) {
  return { ...p, plan: parseJson(p.plan, {}) };
}

export interface ImageRow {
  id: string;
  user_id: string;
  assessment_id: string | null;
  file_name: string;
  area: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  face_check: string | null;
  created_at: string;
}
