import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { T } from './Typography';

interface Props {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  backLabel?: string;
}

/** "← Tillbaka      [ Fortsätt → ]" footer used on the flow screens. Without onBack the button spans full width. */
export function FlowFooter({ onBack, onNext, nextLabel = 'Fortsätt', disabled, loading, backLabel = 'Tillbaka' }: Props) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.back} hitSlop={8}>
          <Icon name="arrow-left" size={20} color={colors.inkBrand} strokeWidth={2.2} />
          <T variant="bodyMedium" color={colors.inkBrand}>{backLabel}</T>
        </Pressable>
      ) : null}
      <Button title={`${nextLabel}  →`} onPress={onNext} disabled={disabled} loading={loading} style={[styles.next, !onBack && styles.full]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  next: { flex: 1 },
  full: { flex: 1 },
});
