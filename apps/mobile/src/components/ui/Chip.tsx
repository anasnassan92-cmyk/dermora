import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'attention' | 'danger' | 'success';
}

export function Chip({ label, selected, onPress, tone = 'default' }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.base, styles[tone], selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  default: {},
  attention: { backgroundColor: colors.attentionSoft, borderColor: colors.attentionSoft },
  danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  success: { backgroundColor: colors.surfaceMint, borderColor: colors.surfaceMint },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { ...typography.small, fontFamily: 'Montserrat-Medium', color: colors.ink },
  textSelected: { color: colors.onPrimary },
});
