import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, shadow, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { IconBadge } from './IconBadge';
import { T } from './Typography';

interface Props {
  label: string;
  description?: string | null;
  icon?: IconName | null;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
  /** 'row' = full-width card with text (skin type), 'tile' = square grid tile (concerns) */
  variant?: 'row' | 'tile';
}

/** Selectable card from the design: rounded, mint when selected, check mark top-right. */
export function OptionCard({ label, description, icon, selected, multi, onPress, variant = 'row' }: Props) {
  const tile = variant === 'tile';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.base, tile ? styles.tile : styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? <IconBadge name={icon} size={tile ? 40 : 44} tone={selected ? 'teal' : 'mint'} /> : null}
      <View style={tile ? styles.tileText : styles.rowText}>
        <T variant={tile ? 'caption' : 'bodyMedium'} center={tile} style={tile ? styles.tileLabel : undefined}>
          {label}
        </T>
        {description && !tile ? (
          <T variant="caption" muted>
            {description}
          </T>
        ) : null}
      </View>
      <View style={[styles.check, selected && styles.checkOn]}>{selected ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={2.5} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md + 2, marginBottom: spacing.sm },
  tile: { width: '48%', aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', padding: spacing.sm, marginBottom: spacing.md },
  selected: { borderColor: colors.accent, backgroundColor: colors.surfaceMint },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, gap: 2 },
  tileText: { marginTop: spacing.sm },
  tileLabel: { fontFamily: 'Montserrat-Medium', color: colors.ink },
  check: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
