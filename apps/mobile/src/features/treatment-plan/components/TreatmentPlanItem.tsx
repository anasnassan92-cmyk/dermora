import React from 'react';
import { StyleSheet, View } from 'react-native';

import { T } from '../../../components/ui';
import { colors, spacing } from '../../../theme';
import type { RoutineStep } from '../../../types/api';
import { stepLabel } from './RoutineStepCard';

export function TreatmentPlanItem({ step, index }: { step: RoutineStep; index: number }) {
  return (
    <View style={styles.row}>
      <View style={styles.num}><T variant="caption" color={colors.onPrimary}>{index + 1}</T></View>
      <View style={styles.body}>
        <T variant="bodyMedium">{stepLabel(step)} · <T variant="small" muted>{step.frequency}</T></T>
        <T variant="small">{step.product_type}{step.active_ingredient ? ` – ${step.active_ingredient}` : ''}</T>
        <T variant="caption" muted>{step.why}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body: { flex: 1, gap: 2 },
});
