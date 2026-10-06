import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';

interface Props {
  title?: string;
  text?: string;
  icon?: IconName;
  children?: React.ReactNode;
  tone?: 'mint' | 'white';
}

/** "Bra att veta!" / "Tips!" panel: round icon badge on the left, title + text on the right. */
export function InfoPanel({ title = 'Bra att veta!', text, icon = 'lightbulb', children, tone = 'mint' }: Props) {
  return (
    <View style={[styles.panel, tone === 'white' && styles.white]}>
      <View style={styles.badge}>
        <Icon name={icon} size={26} color={colors.inkBrand} />
      </View>
      <View style={styles.body}>
        <T variant="bodyMedium" mb="xs">{title}</T>
        {text ? <T variant="small" muted>{text}</T> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  white: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.line },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
