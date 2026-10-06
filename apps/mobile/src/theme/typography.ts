import type { TextStyle } from 'react-native';

/** Montserrat weights from the brand kit (loaded in App.tsx with expo-font). */
export const fonts = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semiBold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  h1: { fontFamily: fonts.semiBold, fontSize: 26, lineHeight: 32 },
  h2: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  button: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 20 },
};
