import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, spacing, typography } from '../../theme';

type Variant = keyof typeof typography;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  mb?: keyof typeof spacing;
}

export function T({ variant = 'body', color, muted, center, mb, style, ...rest }: Props) {
  return (
    <Text
      style={[
        typography[variant],
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
