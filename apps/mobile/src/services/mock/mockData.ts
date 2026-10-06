/**
 * Mock data used when EXPO_PUBLIC_API_URL is empty. Mirrors the backend's
 * MockProvider so the app and the API tell the same story in demos.
 */
import type { Assessment, Questionnaire, SkinGuidance, SkinImage, TreatmentPlan } from '../../types/api';

// Same file as apps/api/src/data/questionnaire_v1.json (copied; CI checks they stay identical).
import questionnaireJson from './questionnaire_v1.json';

export const mockQuestionnaire: Questionnaire = questionnaireJson as Questionnaire;

export const mockGuidance: SkinGuidance = {
  skin_type_estimate: 'combination',
  primary_concern: 'Mild till måttlig akne i T-zonen',
  observations: [
    { area: 'forehead', finding: 'Några små finnar och pormaskar', severity: 'mild', confidence: 'medium' },
    { area: 'chin', finding: 'Enstaka röda, ömma finnar', severity: 'mild', confidence: 'medium' },
    { area: 'left_cheek', finding: 'Lugn hud, lätt torrhet', severity: 'none', confidence: 'high' },
  ],
  overall_severity: 'mild',
  image_quality_note: null,
  guidance:
    'Dina svar och bilder tyder på blandhud med mild akne, främst i panna och haka. Det viktigaste nu är en enkel, konsekvent rutin: mild rengöring, en aktiv ingrediens som salicylsyra på kvällen och solskydd varje morgon. Undvik att lägga till många nya produkter samtidigt – ge rutinen 4–6 veckor innan du bedömer effekten. Detta är vägledning, inte en medicinsk diagnos.',
  plan: {
    title: 'Lugn start för blandhud med mild akne',
    summary: 'En enkel rutin i tre steg morgon och kväll, med salicylsyra varannan kväll. Uppföljning med ny bild om två veckor.',
    morning: [
      { step: 'Rengöring', product_type: 'Mild, parfymfri rengöring', active_ingredient: null, frequency: 'Varje morgon', why: 'Tar bort talg utan att torka ut.' },
      { step: 'Fukt', product_type: 'Lätt, oljefri fuktkräm', active_ingredient: 'Niacinamid', frequency: 'Varje morgon', why: 'Stärker hudbarriären och lugnar rodnad.' },
      { step: 'Solskydd', product_type: 'SPF 30+ för ansiktet', active_ingredient: null, frequency: 'Varje morgon', why: 'Förebygger mörka fläckar efter finnar.' },
    ],
    evening: [
      { step: 'Rengöring', product_type: 'Samma milda rengöring', active_ingredient: null, frequency: 'Varje kväll', why: 'Tar bort dagens smuts och solskydd.' },
      { step: 'Behandling', product_type: 'Exfolierande serum eller toner', active_ingredient: 'Salicylsyra 2 %', frequency: 'Varannan kväll', why: 'Rensar porer och minskar nya finnar.' },
      { step: 'Fukt', product_type: 'Lätt fuktkräm', active_ingredient: null, frequency: 'Varje kväll', why: 'Motverkar torrhet från syran.' },
    ],
    weekly: [],
    goals: ['Minska utbrott', 'Balansera talgproduktion', 'Stärka hudbarriären', 'Jämnare hudstruktur'],
    key_ingredients: [
      'Salicylsyra 2 % – rensar porer och förebygger nya finnar',
      'Niacinamid – lugnar rodnad och balanserar talg',
      'Ceramider – stärker hudbarriären',
      'SPF 30+ – förebygger mörka fläckar efter finnar',
    ],
    tips: ['Byt örngott varje vecka', 'Rör inte ansiktet under dagen', 'Rengör mobilskärmen regelbundet', 'Prioritera sömn – stress förvärrar ofta akne'],
    avoid: ['Skrubbar med korn', 'Att klämma finnar', 'Att prova flera nya aktiva produkter samtidigt'],
    expectations: 'Lite torrhet första veckan är normalt. Färre nya finnar brukar synas efter 4–6 veckor.',
    follow_up_days: 14,
  },
  red_flags: [],
  seek_care: false,
  disclaimer: 'Dermora ger vägledning, inte medicinsk diagnos. Kontakta vården vid oro.',
};

export function mockAssessment(id = 'mock-assessment-1'): Assessment {
  return {
    id, user_id: 'mock', questionnaire_version: '1.0.0', status: 'draft', answers: {}, image_ids: [],
    created_at: new Date().toISOString(), submitted_at: null, analyzed_at: null,
  };
}

export function mockImage(assessmentId: string | null, uri: string): SkinImage {
  return {
    id: `mock-img-${Date.now()}`, user_id: 'mock', assessment_id: assessmentId, area: 'face', width: 1200, height: 1600, bytes: 240000,
    face_check: { face_found: true, faces: 1, blur_score: 180, brightness: 140, face_coverage: 0.22, ok: true, reasons: [] },
    taken_at: new Date().toISOString(), created_at: new Date().toISOString(), url: uri,
  };
}

export function mockPlanFromGuidance(g: SkinGuidance, assessmentId: string | null): TreatmentPlan {
  return {
    id: `mock-plan-${Date.now()}`, user_id: 'mock', assessment_id: assessmentId, status: 'proposed', title: g.plan.title,
    summary: g.plan.summary, plan: g.plan, confirmed_at: null, created_at: new Date().toISOString(), updated_at: null,
  };
}

export function mockChatReply(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('varför')) {
    return 'Salicylsyra föreslås eftersom den löser upp talg i porerna och passar blandhud med finnar i T-zonen. Börja varannan kväll så att huden hinner vänja sig. Detta är vägledning, inte diagnos.';
  }
  if (m.includes('läkare') || m.includes('vård')) {
    return 'Kontakta vården om du får djupa, smärtsamma knölar, snabb försämring, feber eller om rutinen inte hjälpt efter 8–12 veckor. Dermora ersätter inte en läkare.';
  }
  return 'Bra fråga! Utifrån din plan är det viktigaste att vara konsekvent i 4–6 veckor och att använda solskydd varje morgon. Vill du att jag förklarar något steg närmare?';
}
