import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { ProgressBar } from './ProgressBar';
import { T } from './Typography';

interface Props {
  step: number;
  total: number;
}

/** "1/3" progress strip used in the profile and questionnaire flows. */
export function StepHeader({ step, total }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bar}>
        <ProgressBar value={step / total} />
      </View>
      <T variant="caption" muted style={styles.label}>
        {step}/{total}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  bar: { flex: 1 },
  label: { ...typography.caption, color: colors.inkMuted, minWidth: 28, textAlign: 'right' },
});
