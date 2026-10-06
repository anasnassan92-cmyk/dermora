import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, T } from '../../../components/ui';
import { productImageFor } from '../../../constants/design';
import { colors, palette, radius, spacing } from '../../../theme';
import type { RoutineStep } from '../../../types/api';

interface Props {
  steps: RoutineStep[];
  tone?: 'sun' | 'moon' | 'week';
}

/** Horizontal strip of numbered product cards – design screens 13 and 15. */
export function RoutineStepStrip({ steps, tone = 'sun' }: Props) {
  const badge = tone === 'moon' ? palette.lavender : tone === 'week' ? colors.surfaceMint : colors.surfaceMint;
  const badgeInk = tone === 'moon' ? palette.lavenderInk : colors.inkBrand;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {steps.map((s, i) => (
        <React.Fragment key={`${s.step}-${i}`}>
          <View style={styles.card}>
            <View style={[styles.num, { backgroundColor: badge }]}><T variant="caption" color={badgeInk} style={styles.numText}>{i + 1}</T></View>
            <Image source={productImageFor(s.step, s.product_type)} style={styles.img} resizeMode="contain" />
            <T variant="bodyMedium" center numberOfLines={1}>{s.step}</T>
            <T variant="caption" muted center numberOfLines={2} style={styles.sub}>{s.product_type}</T>
            {s.duration ? (
              <View style={styles.time}>
                <Icon name={tone === 'moon' ? 'moon' : tone === 'week' ? 'calendar' : 'sun'} size={12} color={tone === 'moon' ? palette.lavenderInk : palette.sunInk} />
                <T variant="caption" color={colors.inkBrand}>{s.duration}</T>
              </View>
            ) : null}
          </View>
          {i < steps.length - 1 ? <View style={styles.arrow}><Icon name="chevron-right" size={16} color={colors.inkMuted} /></View> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

/** Numbered vertical list with product thumbnails – design screen 14. */
export function RoutineStepList({ steps }: { steps: RoutineStep[] }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={`${s.step}-${i}`} style={[styles.row, i < steps.length - 1 && styles.rowLine]}>
          <View style={styles.rowNum}><T variant="caption" color={colors.inkBrand} style={styles.numText}>{i + 1}</T></View>
          <Image source={productImageFor(s.step, s.product_type)} style={styles.rowImg} resizeMode="contain" />
          <T variant="small" style={styles.rowLabel} numberOfLines={1}>{s.step}</T>
          <Icon name="chevron-right" size={16} color={colors.inkMuted} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 6, paddingVertical: spacing.xs },
  card: { width: 128, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  num: { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: 'Montserrat-SemiBold' },
  img: { width: 72, height: 84, marginTop: spacing.sm, marginBottom: spacing.xs },
  sub: { minHeight: 32 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: spacing.xs },
  arrow: { alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  rowImg: { width: 28, height: 34 },
  rowLabel: { flex: 1 },
});
