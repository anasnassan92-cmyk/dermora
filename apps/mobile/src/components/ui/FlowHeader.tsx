import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { Icon } from './Icon';
import { T } from './Typography';

interface Props {
  /** 1-based step within the 4-segment onboarding indicator: 1 Grundprofil · 2 Frågor · 3 Bilder · 4 Analys. */
  step: number;
  total?: number;
  /** How far the current step has come (0–1). Earlier segments are full, later ones empty. */
  fraction?: number;
  onBack?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Back chevron + segmented progress + optional "Hoppa över" – top of every flow screen. */
export function FlowHeader({ step, total = 4, fraction = 1, onBack, onSkip, skipLabel = 'Hoppa över' }: Props) {
  const pct = Math.max(0, Math.min(1, fraction));
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} disabled={!onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Tillbaka" style={[styles.back, !onBack && styles.hidden]}>
        <Icon name="chevron-left" size={26} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.segments}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={styles.segment} accessibilityLabel={`Steg ${i + 1} av ${total}`}>
            {i < step - 1 ? <View style={styles.fill} /> : i === step - 1 && pct > 0 ? <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} /> : null}
          </View>
        ))}
      </View>
      <Pressable onPress={onSkip} disabled={!onSkip} hitSlop={12} accessibilityRole="button" style={[styles.skip, !onSkip && styles.hidden]}>
        <T variant="small" color={colors.inkBrand}>{skipLabel}</T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl, minHeight: 32 },
  back: { width: 36, alignItems: 'flex-start' },
  hidden: { opacity: 0 },
  segments: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.md },
  segment: { width: 44, height: 7, borderRadius: radius.full, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  fill: { height: '100%', width: '100%', borderRadius: radius.full, backgroundColor: colors.accent },
  skip: { minWidth: 36, alignItems: 'flex-end' },
});
