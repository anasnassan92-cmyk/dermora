import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { IconBadge } from './IconBadge';
import { T } from './Typography';

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: 'chevron' | 'none';
}

/** Row with mint icon badge, title, subtitle and chevron – used in plan and profile screens. */
export function ListRow({ icon, title, subtitle, onPress, trailing = 'chevron' }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <IconBadge name={icon} size={40} />
      <View style={styles.text}>
        <T variant="bodyMedium">{title}</T>
        {subtitle ? <T variant="caption" muted>{subtitle}</T> : null}
      </View>
      {trailing === 'chevron' && onPress ? <Icon name="chevron-right" size={20} color={colors.inkMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
});
