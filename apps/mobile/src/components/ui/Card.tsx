import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '../../theme';

interface Props extends ViewProps {
  tone?: 'raised' | 'mint' | 'attention' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function Card({ tone = 'raised', style, children, ...rest }: Props) {
  return (
    <View style={[styles.base, styles[tone], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  raised: { backgroundColor: colors.surfaceRaised, ...shadow.sm },
  mint: { backgroundColor: colors.surfaceMint },
  attention: { backgroundColor: colors.attentionSoft },
  danger: { backgroundColor: colors.dangerSoft },
});
