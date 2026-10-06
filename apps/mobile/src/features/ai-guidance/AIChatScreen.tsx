/**
 * Design screen 12 – "Din AI-vägledning är redo!" + chat. Owner: Youssef.
 * Conversation is per assessment; the backend keeps the context.
 */
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Blob, Button, Disclaimer, FlowHeader, Icon, Screen, T, type IconName } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import type { ChatMessage, SkinGuidance } from '../../types/api';
import { AIMessage } from './components/AIMessage';

const QUICK: { icon: IconName; label: string; prompt: string }[] = [
  { icon: 'sparkles', label: 'Få en hudvårdsrutin', prompt: 'Kan du sammanfatta min hudvårdsrutin?' },
  { icon: 'cream-jar', label: 'Produktrekommendationer', prompt: 'Vilka produkttyper och ingredienser passar min hud?' },
  { icon: 'document', label: 'Förstå mina resultat', prompt: 'Förklara vad du såg i min hudanalys.' },
  { icon: 'chat', label: 'Ställ en fråga', prompt: '' },
];

const SKIN_LABEL: Record<string, string> = { oily: 'Fet hud', dry: 'Torr hud', combination: 'Kombinationshud', normal: 'Normal hud', sensitive: 'Känslig hud', unknown: 'Okänd' };

export function AIChatScreen({ navigation, route }: AppScreenProps<'AIChat'>) {
  const { assessmentId } = route.params;
  const [guidance, setGuidance] = useState<SkinGuidance | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    aiService.latestResult(assessmentId).then((r) => setGuidance(r?.result ?? null));
    aiService.history(assessmentId).then((h) => setMessages(h.filter((m) => m.role === 'user' || h.indexOf(m) > 0)));
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

  const header = (
    <View>
      <Blob />
      <FlowHeader step={4} onBack={() => navigation.goBack()} onSkip={() => navigation.navigate('TreatmentPlan', { assessmentId })} />
      <View style={styles.intro}>
        <View style={styles.introText}>
          <T variant="display" style={styles.title}>Din AI-vägledning{'\n'}är redo!</T>
          <T variant="body" muted>Baserat på din hudanalys, dina svar och dina bilder kan jag nu ge dig personliga rekommendationer.</T>
        </View>
        <View style={styles.robotCol}>
          <Image source={DESIGN['robot-wave']} style={styles.robot} resizeMode="contain" />
          <View style={styles.bubble}><T variant="caption">Jag är här för att hjälpa dig med din hud!</T></View>
        </View>
      </View>

      <Bot text={'Hej! Jag heter Dermora, din personliga AI-hudexpert. ✨\n\nJag har analyserat dina bilder och svar, och är redo att hjälpa dig.'} />
      <Bot text="Här är en kort sammanfattning av din hud:" />
      {guidance ? (
        <View style={styles.profileCard}>
          <View style={styles.profileHead}>
            <T variant="bodyMedium">Din hudprofil</T>
            <Pressable onPress={() => navigation.navigate('Result', { assessmentId })} accessibilityRole="button" style={styles.detailsLink}>
              <T variant="small" color={colors.inkBrand}>Se detaljer</T>
              <Icon name="chevron-right" size={16} color={colors.inkBrand} />
            </Pressable>
          </View>
          <View style={styles.profileGrid}>
            <Fact icon="drop" label="Hudtyp" value={SKIN_LABEL[guidance.skin_type_estimate] ?? guidance.skin_type_estimate} />
            <Fact icon="face" label="Huvudproblem" value={guidance.primary_concern} />
            <Fact icon="skin-layers" label="Hudtextur" value={guidance.skin_texture || '–'} />
            <Fact icon="bubbles" label="Känslighet" value={guidance.sensitivity || '–'} />
          </View>
        </View>
      ) : null}
      <Bot text={'Vad vill du att vi fokuserar på idag?'} sub="Du kan ställa frågor, be om rekommendationer eller få hjälp med en skräddarsydd hudvårdsrutin." />
      {messages.length === 0 ? (
        <View style={styles.quick}>
          {QUICK.map((q) => (
            <Pressable key={q.label} onPress={() => (q.prompt ? send(q.prompt) : input.current?.focus())} style={styles.quickBtn} accessibilityRole="button">
              <Icon name={q.icon} size={18} color={colors.inkBrand} />
              <T variant="small" style={styles.quickLabel}>{q.label}</T>
              <Icon name="chevron-right" size={16} color={colors.inkMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View>
          <View style={styles.inputRow}>
            <Icon name="image" size={22} color={colors.inkMuted} />
            <TextInput ref={input} value={draft} onChangeText={setDraft} placeholder="Skriv din fråga här …" placeholderTextColor={colors.inkMuted} style={styles.input} multiline maxLength={2000} accessibilityLabel="Meddelande" />
            <Pressable onPress={() => send(draft)} disabled={!draft.trim() || sending} style={[styles.send, (!draft.trim() || sending) && styles.sendOff]} accessibilityRole="button" accessibilityLabel="Skicka">
              <Icon name="arrow-right" size={20} color={colors.onPrimary} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Button title="Fortsätt till min plan  →" onPress={() => navigation.navigate('TreatmentPlan', { assessmentId })} style={styles.cta} />
        </View>
      }
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => <AIMessage message={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListFooterComponent={<Disclaimer />}
        onContentSizeChange={() => messages.length && listRef.current?.scrollToEnd({ animated: false })}
      />
    </Screen>
  );
}

function Bot({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={styles.botRow}>
      <Image source={DESIGN['robot-avatar']} style={styles.avatar} />
      <View style={styles.botBubble}>
        <T variant="body">{text}</T>
        {sub ? <T variant="small" muted>{sub}</T> : null}
      </View>
    </View>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factIcon}><Icon name={icon} size={18} color={colors.inkBrand} /></View>
      <View style={styles.factText}>
        <T variant="caption" muted>{label}</T>
        <T variant="small" style={styles.factValue}>{value}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  intro: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  introText: { flex: 1.3 },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  robotCol: { flex: 0.9, alignItems: 'center' },
  robot: { width: 120, height: 110 },
  bubble: { backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.xs },
  botRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMint },
  botBubble: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, borderTopLeftRadius: 6, padding: spacing.md + 2, gap: 4 },
  profileCard: { marginLeft: 48, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  profileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  detailsLink: { flexDirection: 'row', alignItems: 'center' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { width: '48%', flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.sm },
  factIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  factText: { flex: 1 },
  factValue: { fontFamily: 'Montserrat-Medium' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.lg },
  quickBtn: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  quickLabel: { flex: 1, fontFamily: 'Montserrat-Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, paddingLeft: spacing.lg, paddingRight: 6, paddingVertical: 6 },
  input: { ...typography.small, flex: 1, maxHeight: 100, paddingVertical: spacing.sm, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  cta: { marginTop: spacing.md },
});
