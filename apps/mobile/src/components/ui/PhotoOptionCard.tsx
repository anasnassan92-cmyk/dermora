import React from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { colors, radius, shadow, spacing } from '../../theme';
import { Icon } from './Icon';
import { T } from './Typography';

interface Props {
  label: string;
  description?: string | null;
  image?: ImageSourcePropType | null;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}

/** Selectable card with a photo thumbnail, title, description and radio/checkbox – design screens 6–8. */
export function PhotoOptionCard({ label, description, image, selected, multi, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {image ? <Image source={image} style={styles.thumb} /> : null}
      <View style={styles.text}>
        <T variant="bodyMedium">{label}</T>
        {description ? <T variant="caption" muted>{description}</T> : null}
      </View>
      <View style={[styles.control, multi ? styles.box : styles.circle, selected && styles.controlOn]}>
        {selected ? multi ? <Icon name="check" size={13} color={colors.onPrimary} strokeWidth={3} /> : <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  selected: { borderColor: colors.accent, backgroundColor: '#F2FAF8' },
  pressed: { opacity: 0.9 },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  text: { flex: 1, gap: 2 },
  control: { width: 26, height: 26, borderWidth: 2, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  circle: { borderRadius: 13 },
  box: { borderRadius: 7 },
  controlOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.onPrimary },
});
