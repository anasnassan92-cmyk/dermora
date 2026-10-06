import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DISCLAIMER } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme';

/** Shown on every screen that displays AI output. Not optional. */
export function Disclaimer({ text = DISCLAIMER }: { text?: string }) {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.lg,
  },
  text: { ...typography.caption, color: colors.inkMuted, textAlign: 'center' },
});
