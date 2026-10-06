/**
 * Types mirroring the backend contracts in apps/api/src/schemas/*.py.
 * If you change a schema on the backend, change it here in the same PR.
 */

// ---- profile ----
export type SkinType = 'oily' | 'dry' | 'combination' | 'normal' | 'sensitive' | 'unknown';

export type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';
export type Gender = 'female' | 'male' | 'non_binary' | 'undisclosed';
export type SkinTone = 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  id: string;
  display_name: string | null;
  birth_year: number | null;
  age_range: AgeRange | null;
  gender: Gender | null;
  country: string | null;
  skin_tone: SkinTone | null;
  skin_type: SkinType;
  consent_images: boolean;
  consent_at: string | null;
  locale: string;
}

export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'birth_year' | 'age_range' | 'gender' | 'country' | 'skin_tone' | 'skin_type' | 'consent_images' | 'locale'>>;

// ---- questionnaire ----
export type QuestionType = 'single' | 'multi' | 'scale' | 'text' | 'boolean';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
}

export interface ShowIf {
  question_id: string;
  equals?: string | boolean | null;
  includes?: string | null;
  gte?: number | null;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  help?: string | null;
  required: boolean;
  options: QuestionOption[];
  min?: number | null;
  max?: number | null;
  show_if?: ShowIf | null;
  layout?: 'list' | 'grid' | 'cards' | null;
  context?: string | null;
  note?: string | null;
}

export interface Questionnaire {
  version: string;
  title: string;
  questions: Question[];
}

export type AnswerValue = string | string[] | number | boolean;
export type Answers = Record<string, AnswerValue>;

export type AssessmentStatus = 'draft' | 'submitted' | 'analyzed' | 'failed';

export interface Assessment {
  id: string;
  user_id: string;
  questionnaire_version: string;
  status: AssessmentStatus;
  answers: Answers;
  image_ids: string[];
  created_at: string | null;
  submitted_at: string | null;
  analyzed_at: string | null;
}

// ---- images ----
export type ImageArea = 'face' | 'left' | 'right' | 'closeup' | 'forehead' | 'left_cheek' | 'right_cheek' | 'chin' | 'other';

export interface FaceCheck {
  face_found: boolean;
  faces: number;
  blur_score: number;
  brightness: number;
  face_coverage: number;
  ok: boolean;
  reasons: string[];
}

export interface SkinImage {
  id: string;
  user_id: string;
  assessment_id: string | null;
  area: ImageArea;
  width: number | null;
  height: number | null;
  bytes: number | null;
  face_check: FaceCheck | null;
  taken_at: string | null;
  created_at: string | null;
  url: string | null;
}

// ---- AI ----
export type Severity = 'none' | 'mild' | 'moderate' | 'severe';
export type Confidence = 'low' | 'medium' | 'high';

export interface Observation {
  area: 'forehead' | 'nose' | 'left_cheek' | 'right_cheek' | 'chin' | 'jawline' | 'overall';
  finding: string;
  severity: Severity;
  confidence: Confidence;
}

export interface RoutineStep {
  step: string;
  product_type: string;
  active_ingredient: string | null;
  frequency: string;
  duration?: string | null;
  why: string;
}

export interface TreatmentPlanProposal {
  title: string;
  summary: string;
  goals: string[];
  morning: RoutineStep[];
  evening: RoutineStep[];
  weekly: RoutineStep[];
  key_ingredients: string[];
  tips: string[];
  avoid: string[];
  expectations: string;
  follow_up_days: number;
}

export interface SkinGuidance {
  skin_type_estimate: SkinType;
  primary_concern: string;
  skin_texture?: string;
  sensitivity?: string;
  observations: Observation[];
  overall_severity: Severity;
  image_quality_note: string | null;
  guidance: string;
  plan: TreatmentPlanProposal;
  red_flags: string[];
  seek_care: boolean;
  disclaimer: string;
}

export interface AnalyzeResult {
  assessment_id: string;
  provider: string;
  model: string;
  result: SkinGuidance;
}

export interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string | null;
}

// ---- plans ----
export type PlanStatus = 'proposed' | 'confirmed' | 'archived';

export interface TreatmentPlan {
  id: string;
  user_id: string;
  assessment_id: string | null;
  status: PlanStatus;
  title: string;
  summary: string | null;
  plan: TreatmentPlanProposal;
  confirmed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
