import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';

interface Props {
  label: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

/** One selectable answer row (radio or checkbox look). */
export function QuestionOption({ label, selected, multi, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    >
      <View style={[styles.indicator, multi ? styles.box : styles.circle, selected && styles.indicatorOn]}>
        {selected ? <View style={[styles.dot, multi && styles.tick]} /> : null}
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    marginBottom: spacing.sm,
  },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceMint },
  pressed: { opacity: 0.85 },
  indicator: { width: 22, height: 22, borderWidth: 2, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center' },
  circle: { borderRadius: 11 },
  box: { borderRadius: 6 },
  indicatorOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.onPrimary },
  tick: { borderRadius: 2 },
  label: { ...typography.body, flex: 1, color: colors.ink },
  labelSelected: { fontFamily: 'Montserrat-Medium' },
});
