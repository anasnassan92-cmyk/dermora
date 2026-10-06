import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import type { ChatMessage } from '../../../types/api';

export function AIMessage({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {!mine ? <View style={styles.avatar}><Text style={styles.avatarText}>D</Text></View> : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAI]}>
        <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md, maxWidth: '88%' },
  rowMine: { alignSelf: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.caption, fontFamily: 'Montserrat-SemiBold', color: colors.onBrand },
  bubble: { padding: spacing.md + 2, borderRadius: radius.md },
  bubbleAI: { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  text: { ...typography.small, color: colors.ink },
  textMine: { color: colors.onPrimary },
});
