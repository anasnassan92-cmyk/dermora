/**
 * Dermora colour tokens – brand kit v1.1 palette + the warm, Scandinavian
 * surface treatment from the final UI/UX (cream background, navy headings).
 * Owner: Even (shared UI / theme). Do not add ad-hoc colours in screens; add a token here.
 */
export const palette = {
  teal: '#0C9387',
  mint: '#DFF2F0',
  skin: '#F8FCFB',
  cream: '#FAF7F0',
  charcoal: '#1F1F1F',
  navy: '#121C33',
  gray: '#E9ECEF',
  deepTeal: '#04776B',
  tealMid: '#088579',
  tealSoft: '#3DA99F',
  tealLight: '#6DBEB7',
  mintDeep: '#B5DFDB',
  sun: '#FFF1C9',
  sunInk: '#E0A100',
  lavender: '#EEE9FF',
  lavenderInk: '#7D6BE0',
  white: '#FFFFFF',
} as const;

export const colors = {
  surface: palette.cream,
  surfaceRaised: palette.white,
  surfaceSunken: '#F1EDE4',
  surfaceMint: palette.mint,
  surfaceBrand: palette.teal,
  surfaceBrandStrong: palette.deepTeal,
  line: '#E6E1D6',
  borderControl: '#A9B0AE',
  ink: palette.navy,
  inkMuted: '#6B7280',
  inkBrand: palette.deepTeal,
  inkAccent: palette.teal,
  primary: palette.teal,
  primaryHover: palette.deepTeal,
  onPrimary: palette.white,
  onBrand: palette.white,
  accent: palette.teal,
  attention: '#9A4716',
  attentionSoft: '#F8E4D5',
  danger: '#C0392B',
  dangerSoft: '#F7DEDA',
  success: palette.deepTeal,
  rating: '#F2B01E',
  blob: 'rgba(223, 242, 240, 0.9)',
} as const;

export type ColorToken = keyof typeof colors;
