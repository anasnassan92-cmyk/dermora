/**
 * AI chat – owner: Youssef. Design screen 12 ("AI-vägledning").
 * Conversation is per assessment; the backend keeps the context.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Disclaimer, Icon, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, radius, spacing, typography } from '../../theme';
import type { ChatMessage } from '../../types/api';
import { AIMessage } from './components/AIMessage';

const SUGGESTIONS = ['Varför föreslår du salicylsyra?', 'Hur länge innan jag ser resultat?', 'När bör jag kontakta en läkare?'];

export function AIChatScreen({ navigation, route }: AppScreenProps<'AIChat'>) {
  const { assessmentId } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    aiService.history(assessmentId).then((h) =>
      setMessages(
        h.length
          ? h
          : [{ id: 'intro', role: 'assistant', content: 'Hej! Jag är Dermora AI. Jag har nu analyserat dina svar och bilder.\n\nVad skulle du vilja veta om din hud?' }],
      ),
    );
  }, [assessmentId]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setDraft('');
    setSending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString() }]);
    try {
      const reply = await aiService.send(assessmentId, content);
      setMessages((m) => [...m, { ...reply, created_at: reply.created_at ?? new Date().toISOString() }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: `Något gick fel: ${(e as Error).message}` }]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View>
          {messages.length <= 1 ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={styles.suggestion} accessibilityRole="button">
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Skriv ett meddelande..."
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              multiline
              maxLength={2000}
              accessibilityLabel="Meddelande"
            />
            <Pressable onPress={() => send(draft)} disabled={!draft.trim() || sending} style={[styles.send, (!draft.trim() || sending) && styles.sendOff]} accessibilityRole="button" accessibilityLabel="Skicka">
              <Icon name="arrow-right" size={20} color={colors.onPrimary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Tillbaka" style={styles.back}>
          <Icon name="chevron-left" size={22} />
        </Pressable>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerText}>
          <T variant="bodyMedium">Dermora AI</T>
          <View style={styles.online}>
            <View style={styles.onlineDot} />
            <T variant="caption" muted>Online</T>
          </View>
        </View>
        <Icon name="info" size={20} color={colors.inkMuted} />
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => <AIMessage message={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={<Disclaimer />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surfaceRaised },
  back: { padding: 4 },
  logo: { width: 32, height: 28 },
  headerText: { flex: 1 },
  online: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  list: { padding: spacing.xl, paddingBottom: spacing.xxl },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  suggestion: { backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm, marginBottom: spacing.sm },
  suggestionText: { ...typography.caption, color: colors.inkBrand, fontFamily: 'Montserrat-Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    ...typography.small,
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    color: colors.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
