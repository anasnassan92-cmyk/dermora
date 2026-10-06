/**
 * Mock data used when EXPO_PUBLIC_API_URL is empty. Mirrors the backend's
 * MockProvider so the app and the API tell the same story in demos.
 */
import type { Assessment, Questionnaire, SkinGuidance, SkinImage, TreatmentPlan } from '../../types/api';

export const mockQuestionnaire: Questionnaire = {
  version: '1.0.0',
  title: 'Berätta om din hud',
  questions: [
    {
      id: 'skin_type', type: 'single', title: 'Hur skulle du beskriva din hud?', help: 'Välj det som stämmer bäst de flesta dagar.', required: true,
      options: [
        { value: 'oily', label: 'Fet – blir glansig under dagen' },
        { value: 'dry', label: 'Torr – stram eller fjällig' },
        { value: 'combination', label: 'Blandhud – fet i T-zonen, torr på kinderna' },
        { value: 'normal', label: 'Normal – varken fet eller torr' },
        { value: 'unknown', label: 'Vet inte' },
      ],
    },
    { id: 'sensitive', type: 'boolean', title: 'Reagerar din hud lätt med rodnad, sveda eller klåda?', required: true, options: [] },
    {
      id: 'concerns', type: 'multi', title: 'Vilka besvär vill du ha hjälp med?', help: 'Välj alla som stämmer.', required: true,
      options: [
        { value: 'acne', label: 'Finnar / akne' },
        { value: 'blackheads', label: 'Pormaskar' },
        { value: 'redness', label: 'Rodnad / irritation' },
        { value: 'dark_spots', label: 'Mörka fläckar / ärr efter finnar' },
        { value: 'dryness', label: 'Torrhet / fjällning' },
        { value: 'texture', label: 'Ojämn hudstruktur' },
        { value: 'other', label: 'Annat' },
      ],
    },
    {
      id: 'acne_area', type: 'multi', title: 'Var får du oftast finnar?', required: true, show_if: { question_id: 'concerns', includes: 'acne' },
      options: [
        { value: 'forehead', label: 'Panna' }, { value: 'nose', label: 'Näsa' }, { value: 'cheeks', label: 'Kinder' },
        { value: 'chin', label: 'Haka / käklinje' }, { value: 'back', label: 'Rygg / bröst' },
      ],
    },
    {
      id: 'acne_frequency', type: 'single', title: 'Hur ofta får du nya finnar?', required: true, show_if: { question_id: 'concerns', includes: 'acne' },
      options: [
        { value: 'rarely', label: 'Någon gång i månaden' }, { value: 'weekly', label: 'Varje vecka' }, { value: 'constant', label: 'Nästan hela tiden' },
      ],
    },
    {
      id: 'acne_type', type: 'multi', title: 'Hur ser finnarna oftast ut?', required: true, show_if: { question_id: 'concerns', includes: 'acne' },
      options: [
        { value: 'whiteheads', label: 'Små vita' }, { value: 'papules', label: 'Röda, ömma' },
        { value: 'cystic', label: 'Djupa, hårda knölar' }, { value: 'mixed', label: 'Blandat' },
      ],
    },
    {
      id: 'acne_pain', type: 'scale', title: 'Hur ömma eller smärtsamma är de? (0 = inte alls, 10 = mycket)', required: true,
      show_if: { question_id: 'acne_type', includes: 'cystic' }, min: 0, max: 10, options: [],
    },
    {
      id: 'duration', type: 'single', title: 'Hur länge har du haft besvären?', required: true,
      options: [
        { value: 'lt_1m', label: 'Mindre än en månad' }, { value: '1_6m', label: '1–6 månader' },
        { value: '6_12m', label: '6–12 månader' }, { value: 'gt_1y', label: 'Mer än ett år' },
      ],
    },
    {
      id: 'sudden_change', type: 'boolean', required: true, options: [],
      title: 'Har huden förändrats snabbt de senaste två veckorna (ny utbredd rodnad, svullnad, vätskande sår eller feber)?',
      help: 'Detta hjälper oss att veta när du bör söka vård i stället för egenvård.',
    },
    {
      id: 'current_routine', type: 'multi', title: 'Vad använder du i dag?', required: true,
      options: [
        { value: 'cleanser', label: 'Rengöring' }, { value: 'moisturizer', label: 'Fuktkräm' }, { value: 'spf', label: 'Solskydd (SPF)' },
        { value: 'actives', label: 'Aktiva ingredienser (syror, retinol, bensoylperoxid)' },
        { value: 'prescription', label: 'Receptbelagd behandling' }, { value: 'nothing', label: 'Inget särskilt' },
      ],
    },
    { id: 'actives_which', type: 'text', title: 'Vilka aktiva ingredienser eller produkter använder du?', required: false, options: [], show_if: { question_id: 'current_routine', includes: 'actives' } },
    { id: 'prescription_which', type: 'text', title: 'Vilken receptbelagd behandling använder du?', required: false, options: [], show_if: { question_id: 'current_routine', includes: 'prescription' } },
    { id: 'tried_before', type: 'text', title: 'Vad har du provat tidigare, och hur fungerade det?', help: "Fri text. T.ex. 'Salicylsyra från apoteket, hjälpte lite men torkade ut'.", required: false, options: [] },
    {
      id: 'lifestyle', type: 'multi', title: 'Stämmer något av detta?', required: false,
      options: [
        { value: 'stress', label: 'Mycket stress just nu' }, { value: 'poor_sleep', label: 'Sover dåligt' },
        { value: 'shaving', label: 'Rakar ansiktet regelbundet' }, { value: 'makeup_daily', label: 'Använder smink dagligen' },
        { value: 'sport_sweat', label: 'Tränar/svettas mycket' }, { value: 'hormonal', label: 'Besvären följer menscykeln' },
      ],
    },
    {
      id: 'goal', type: 'single', title: 'Vad är viktigast för dig just nu?', required: true,
      options: [
        { value: 'fewer_breakouts', label: 'Färre finnar' }, { value: 'calm_skin', label: 'Lugnare, mindre irriterad hud' },
        { value: 'even_tone', label: 'Jämnare hudton' }, { value: 'simple_routine', label: 'En enkel rutin jag orkar följa' },
      ],
    },
  ],
};

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
