/**
 * Dermora colour tokens – mirrors packages/brand/dermora-colors.css (brand kit v1.1).
 * Owner: Even (shared UI / theme). Do not add ad-hoc colours in screens; add a token here.
 */
export const palette = {
  teal: '#0C9387',
  mint: '#DFF2F0',
  skin: '#F8FCFB',
  charcoal: '#1F1F1F',
  gray: '#E9ECEF',
  deepTeal: '#04776B',
  tealMid: '#088579',
  tealSoft: '#3DA99F',
  tealLight: '#6DBEB7',
  mintDeep: '#B5DFDB',
  white: '#FFFFFF',
} as const;

export const colors = {
  surface: palette.skin,
  surfaceRaised: palette.white,
  surfaceSunken: palette.gray,
  surfaceMint: palette.mint,
  surfaceBrand: palette.teal,
  surfaceBrandStrong: palette.deepTeal,
  line: '#DDE3E2',
  borderControl: '#788684',
  ink: palette.charcoal,
  inkMuted: '#5A6462',
  inkBrand: palette.deepTeal,
  inkAccent: palette.teal,
  primary: palette.deepTeal,
  primaryHover: '#035F56',
  onPrimary: palette.white,
  onBrand: palette.white,
  accent: palette.teal,
  attention: '#9A4716',
  attentionSoft: '#F8E4D5',
  danger: '#A3362B',
  dangerSoft: '#F7DEDA',
  success: palette.deepTeal,
  rating: '#C98A1E',
} as const;

export type ColorToken = keyof typeof colors;
