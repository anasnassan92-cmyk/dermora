import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/ui';
import { colors, radius, shadow, spacing, typography } from '../../../theme';

interface Props {
  label: string;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

/** Plain answer row (radio or checkbox) – design screen 8 "Har du känslig hud?". */
export function QuestionOption({ label, selected, multi, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.indicator, multi ? styles.box : styles.circle, selected && styles.indicatorOn]}>
        {selected ? multi ? <Icon name="check" size={13} color={colors.onPrimary} strokeWidth={3} /> : <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  rowSelected: { borderColor: colors.accent, backgroundColor: '#F2FAF8' },
  pressed: { opacity: 0.9 },
  indicator: { width: 26, height: 26, borderWidth: 2, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  circle: { borderRadius: 13 },
  box: { borderRadius: 7 },
  indicatorOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.onPrimary },
  label: { ...typography.bodyMedium, flex: 1, color: colors.ink },
  labelSelected: { color: colors.ink },
});
