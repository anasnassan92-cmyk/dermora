import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';
import type { ChatMessage } from '../../../types/api';

function time(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export function AIMessage({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {!mine ? <Image source={require('../../../../assets/logo/symbol.png')} style={styles.avatar} resizeMode="contain" /> : null}
      <View style={styles.col}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAI]}>
          <Text style={[styles.text, mine && styles.textMine]}>{message.content}</Text>
        </View>
        <Text style={[styles.time, mine && styles.timeMine]}>{time(message.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md, maxWidth: '88%' },
  rowMine: { alignSelf: 'flex-end' },
  col: { flexShrink: 1 },
  avatar: { width: 28, height: 24, marginBottom: 18 },
  bubble: { padding: spacing.md + 2, borderRadius: radius.md },
  bubbleAI: { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  text: { ...typography.small, color: colors.ink },
  textMine: { color: colors.onPrimary },
  time: { ...typography.caption, color: colors.inkMuted, marginTop: 4 },
  timeMine: { textAlign: 'right' },
});
