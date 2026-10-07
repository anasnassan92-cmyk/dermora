import React from 'react';
import { StyleSheet, Text, useWindowDimensions, type TextProps } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  mb?: keyof typeof spacing;
}

/** Design width the screens were drawn for. Headlines shrink proportionally on narrower phones. */
export const DESIGN_WIDTH = 390;
const SCALED: Variant[] = ['display', 'h1'];

export function useTypeScale(): number {
  const { width } = useWindowDimensions();
  return Math.min(1, Math.max(0.82, width / DESIGN_WIDTH));
}

export function T({ variant = 'body', color, muted, center, mb, style, ...rest }: Props) {
  const scale = useTypeScale();
  const base = typography[variant];
  const scaled = SCALED.includes(variant) && scale < 1 && base.fontSize && base.lineHeight ? { fontSize: Math.round(base.fontSize * scale), lineHeight: Math.round(base.lineHeight * scale) } : null;
  return (
    <Text
      maxFontSizeMultiplier={1.15}
      style={[
        base,
        scaled,
        { color: color ?? (muted ? colors.inkMuted : colors.ink) },
        center && styles.center,
        mb && { marginBottom: spacing[mb] },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({ center: { textAlign: 'center' } });
