import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import type { ChatMessage } from '../../../types/api';

function time(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

/** Local preview of an attached photo is passed in `sources[0]` for user messages (client only). */
export function AIMessage({ message, onRate }: { message: ChatMessage; onRate?: (rating: 1 | -1) => void }) {
  const mine = message.role === 'user';
  const preview = mine && message.image_id && message.sources?.[0]?.match(/^(file|blob|data|content|ph|http)/) ? message.sources[0] : null;
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      {!mine ? <Image source={require('../../../../assets/logo/symbol.png')} style={styles.avatar} resizeMode="contain" /> : null}
      <View style={styles.col}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAI]}>
          {preview ? <Image source={{ uri: preview }} style={styles.photo} /> : null}
          {message.streaming && !message.content ? (
            <View style={styles.typing}><ActivityIndicator size="small" color={colors.inkBrand} /><Text style={[styles.text, styles.typingText]}>Dermora skriver …</Text></View>
          ) : (
            <Text style={[styles.text, mine && styles.textMine]}>{message.content}{message.streaming ? ' ▍' : ''}</Text>
          )}
        </View>
        <View style={[styles.meta, mine && styles.metaMine]}>
          <Text style={styles.time}>{time(message.created_at)}</Text>
          {onRate ? (
            <View style={styles.rate}>
              <Pressable onPress={() => onRate(1)} accessibilityRole="button" accessibilityLabel="Bra svar" style={[styles.rateBtn, message.rating === 1 && styles.rateOn]}>
                <Icon name="heart" size={14} color={message.rating === 1 ? colors.onPrimary : colors.inkMuted} />
              </Pressable>
              <Pressable onPress={() => onRate(-1)} accessibilityRole="button" accessibilityLabel="Dåligt svar" style={[styles.rateBtn, message.rating === -1 && styles.rateOff]}>
                <Icon name="minus" size={14} color={message.rating === -1 ? colors.onPrimary : colors.inkMuted} />
              </Pressable>
            </View>
          ) : null}
        </View>
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
  photo: { width: 160, height: 160, borderRadius: radius.sm, marginBottom: spacing.sm },
  text: { ...typography.small, color: colors.ink },
  textMine: { color: colors.onPrimary },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typingText: { color: colors.inkMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  metaMine: { justifyContent: 'flex-end' },
  time: { ...typography.caption, color: colors.inkMuted },
  rate: { flexDirection: 'row', gap: 4 },
  rateBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSunken },
  rateOn: { backgroundColor: colors.accent },
  rateOff: { backgroundColor: colors.inkMuted },
});
