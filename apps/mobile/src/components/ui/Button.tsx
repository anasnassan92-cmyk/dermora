import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style, accessibilityLabel }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={6}
      android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary} />
      ) : (
        <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceMint },
  ghost: { backgroundColor: 'transparent', borderColor: '#B5DFDB' },
  danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  text: { ...typography.button },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.inkBrand },
  ghost: { color: colors.inkBrand },
  danger: { color: colors.onPrimary },
});
