/**
 * Image assets cut from the final UI/UX screens (assets/design). Keys are the
 * `image` names used in questionnaire_v1.json and by the plan/product cards.
 * Replace a file to swap the picture – no code change needed.
 */
import type { ImageSourcePropType } from 'react-native';

export const DESIGN: Record<string, ImageSourcePropType> = {
  'welcome-portrait': require('../../assets/design/welcome-portrait.jpg'),
  'robot-thumbs': require('../../assets/design/robot-thumbs.png'),
  'robot-wave': require('../../assets/design/robot-wave.png'),
  'robot-avatar': require('../../assets/design/robot-avatar.png'),
  'robot-plan': require('../../assets/design/robot-plan.png'),
  'skin-oily': require('../../assets/design/skin-oily.jpg'),
  'skin-dry': require('../../assets/design/skin-dry.jpg'),
  'skin-combination': require('../../assets/design/skin-combination.jpg'),
  'skin-sensitive': require('../../assets/design/skin-sensitive.jpg'),
  'concern-acne': require('../../assets/design/concern-acne.jpg'),
  'concern-pigment': require('../../assets/design/concern-pigment.jpg'),
  'concern-redness': require('../../assets/design/concern-redness.jpg'),
  'concern-texture': require('../../assets/design/concern-texture.jpg'),
  'concern-lines': require('../../assets/design/concern-lines.jpg'),
  'concern-dull': require('../../assets/design/concern-dull.jpg'),
  'acne-rarely': require('../../assets/design/acne-rarely.jpg'),
  'acne-sometimes': require('../../assets/design/acne-sometimes.jpg'),
  'acne-often': require('../../assets/design/acne-often.jpg'),
  'acne-very-often': require('../../assets/design/acne-very-often.jpg'),
  'example-front': require('../../assets/design/example-front.jpg'),
  'example-left': require('../../assets/design/example-left.jpg'),
  'example-right': require('../../assets/design/example-right.jpg'),
  'example-closeup': require('../../assets/design/example-closeup.jpg'),
  'product-cleanser': require('../../assets/design/product-cleanser.jpg'),
  'product-toner': require('../../assets/design/product-toner.jpg'),
  'product-serum': require('../../assets/design/product-serum.jpg'),
  'product-sunscreen': require('../../assets/design/product-sunscreen.jpg'),
  'product-moisturizer': require('../../assets/design/product-moisturizer.jpg'),
  'product-eyecream': require('../../assets/design/product-eyecream.jpg'),
  'product-treatment': require('../../assets/design/product-treatment.jpg'),
  envelope: require('../../assets/design/envelope.png'),
  'profile-avatar': require('../../assets/design/profile-avatar.jpg'),
  'analyze-center': require('../../assets/design/analyze-center.jpg'),
};

export function designImage(name?: string | null): ImageSourcePropType | null {
  return name && DESIGN[name] ? DESIGN[name] : null;
}

/** Picks a product picture for a routine step from its step name / product type. */
export function productImageFor(step: string, productType: string): ImageSourcePropType {
  const s = `${step} ${productType}`.toLowerCase();
  if (/solskydd|spf/.test(s)) return DESIGN['product-sunscreen'];
  if (/toner/.test(s)) return DESIGN['product-toner'];
  if (/serum|behandling|syra|retinol/.test(s)) return DESIGN['product-serum'];
  if (/ögon/.test(s)) return DESIGN['product-eyecream'];
  if (/fukt|kräm|mask/.test(s)) return DESIGN['product-moisturizer'];
  return DESIGN['product-cleanser'];
}

/** Four image slots from the design (screens 9–10). */
export const IMAGE_SLOTS: { area: 'face' | 'left' | 'right' | 'closeup'; label: string; example: string }[] = [
  { area: 'face', label: 'Framifrån', example: 'example-front' },
  { area: 'left', label: 'Vänster sida', example: 'example-left' },
  { area: 'right', label: 'Höger sida', example: 'example-right' },
  { area: 'closeup', label: 'Närbild', example: 'example-closeup' },
];

/** Fitzpatrick-inspired skin tone swatches (screen 4). */
export const SKIN_TONES: { value: 1 | 2 | 3 | 4 | 5 | 6; hex: string }[] = [
  { value: 1, hex: '#F6DCCB' },
  { value: 2, hex: '#EFC6A8' },
  { value: 3, hex: '#D9A77E' },
  { value: 4, hex: '#B9815A' },
  { value: 5, hex: '#8E5A3C' },
  { value: 6, hex: '#5A3A2A' },
];
