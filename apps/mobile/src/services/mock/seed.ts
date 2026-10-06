/**
 * DEV ONLY – seeds the in-memory mock services so a preview screen has data.
 * Which data depends on the screen being previewed (later screens need more).
 */
import { assessmentService } from '../../features/assessment/services/assessmentService';
import { planService } from '../../features/treatment-plan/services/planService';
import { aiService } from '../ai/aiService';
import { profileService } from '../profile/profileService';
import { __pushMockImage } from '../storage/imageStorageService';

export interface DemoSeed {
  assessmentId: string;
  planId: string;
}

const ORDER = [
  'Welcome', 'Login', 'Register', 'VerifyEmail', 'ProfileSetup', 'AssessmentIntro', 'Assessment', 'ImageUpload', 'ImageReview',
  'Analyzing', 'Result', 'AIChat', 'TreatmentPlan', 'ConfirmPlan', 'PlanSaved', 'Home', 'Plan', 'Chat', 'Profile', 'Tabs', 'EditProfile',
];

/** A tiny neutral "skin" placeholder (SVG data URL) so image screens have thumbnails without real photos. */
export const PLACEHOLDER_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360"><rect width="300" height="360" fill="#E9D6C8"/><ellipse cx="150" cy="190" rx="90" ry="120" fill="#DFC2B0"/><ellipse cx="118" cy="165" rx="10" ry="6" fill="#8C6A5A"/><ellipse cx="182" cy="165" rx="10" ry="6" fill="#8C6A5A"/><path d="M125 240q25 18 50 0" stroke="#A8786A" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  );

export async function seedDemo(screen: string): Promise<DemoSeed> {
  const stage = Math.max(0, ORDER.indexOf(screen));
  await profileService.update({ display_name: 'Emma Andersson', age_range: '18_24', gender: 'female', country: 'SE', skin_type: 'combination', consent_images: stage >= ORDER.indexOf('ImageUpload') });

  const a = await assessmentService.create();
  await assessmentService.saveAnswers(a.id, {
    skin_type: 'combination',
    sensitive: false,
    concerns: ['acne', 'blackheads'],
    acne_area: ['forehead', 'chin'],
    acne_frequency: 'weekly',
    acne_type: ['whiteheads', 'papules'],
    duration: '1_6m',
    sudden_change: false,
    current_routine: ['cleanser'],
    goal: 'fewer_breakouts',
  });

  let planId = '';
  if (stage >= ORDER.indexOf('ImageReview')) {
    __pushMockImage(a.id, PLACEHOLDER_PHOTO);
    __pushMockImage(a.id, PLACEHOLDER_PHOTO);
  }
  if (stage >= ORDER.indexOf('Result')) {
    await assessmentService.submit(a.id);
    await aiService.analyze(a.id);
  }
  if (stage >= ORDER.indexOf('AIChat')) {
    await aiService.send(a.id, 'Jag får ofta utbrott på kinderna. Vad kan det bero på?');
  }
  if (stage >= ORDER.indexOf('ConfirmPlan')) {
    planId = (await planService.proposeFromAssessment(a.id)).id;
  }
  if (stage >= ORDER.indexOf('PlanSaved')) {
    await planService.confirm(planId);
  }
  return { assessmentId: a.id, planId };
}
