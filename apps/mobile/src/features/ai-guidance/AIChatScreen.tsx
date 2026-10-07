/**
 * Design screen 12 – "Din AI-vägledning är redo!" + chat. Owner: Youssef.
 * Conversation is per assessment; the backend keeps the context (profile, analysis, memory,
 * knowledge base). Replies stream in, every reply offers follow-up questions and can be rated,
 * and the user can attach a new skin photo for the bot to compare with the first one.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Blob, Button, Disclaimer, FlowHeader, Icon, Screen, T, type IconName } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, shadow, spacing, typography } from '../../theme';
import type { ChatMessage, ChatStatus, SkinGuidance } from '../../types/api';
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
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachment, setAttachment] = useState<{ id: string; uri: string } | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const input = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const narrow = width < 420;
  const lastScroll = useRef(0);

  useEffect(() => {
    aiService.latestResult(assessmentId).then((r) => setGuidance(r?.result ?? null));
    aiService.history(assessmentId).then((h) => setMessages(h.filter((m) => m.role === 'user' || h.indexOf(m) > 0)));
    aiService.status(assessmentId).then(setStatus).catch(() => undefined);
  }, [assessmentId]);

  const scrollToEnd = useCallback(() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50), []);
  // While a reply streams in, scroll at most every 400 ms so the list does not jump on every word.
  const scrollThrottled = useCallback(() => {
    const t = Date.now();
    if (t - lastScroll.current < 400) return;
    lastScroll.current = t;
    listRef.current?.scrollToEnd({ animated: false });
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setDraft('');
    setSending(true);
    const imageId = attachment?.id ?? null;
    const imageUri = attachment?.uri ?? null;
    setAttachment(null);
    const streamingId = `stream-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: 'user', content, created_at: new Date().toISOString(), image_id: imageId, ...(imageUri ? { sources: [imageUri] } : {}) },
      { id: streamingId, role: 'assistant', content: '', streaming: true },
    ]);
    scrollToEnd();
    try {
      const reply = await aiService.send(assessmentId, content, {
        imageId,
        onDelta: (partial) => {
          setMessages((m) => m.map((x) => (x.id === streamingId ? { ...x, content: partial } : x)));
          scrollThrottled();
        },
      });
      setMessages((m) => m.map((x) => (x.id === streamingId ? { ...reply, created_at: reply.created_at ?? new Date().toISOString() } : x)));
      if (status?.checkin_due) setStatus({ ...status, checkin_due: false });
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === streamingId ? { id: `err-${Date.now()}`, role: 'assistant', content: `Något gick fel: ${(e as Error).message}` } : x)));
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const attachPhoto = async () => {
    if (attaching || sending) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      setAttaching(true);
      const img = await imageStorageService.upload(picked.assets[0].uri, assessmentId, 'face');
      setAttachment({ id: img.id, uri: picked.assets[0].uri });
      if (!draft.trim()) setDraft('Här är en ny bild – ser du någon skillnad?');
      input.current?.focus();
    } catch (e) {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: 'assistant', content: `Bilden kunde inte laddas upp: ${(e as Error).message}` }]);
    } finally {
      setAttaching(false);
    }
  };

  const rate = async (message: ChatMessage, rating: 1 | -1) => {
    const next = message.rating === rating ? 0 : rating;
    setMessages((m) => m.map((x) => (x.id === message.id ? { ...x, rating: next || null } : x)));
    try {
      await aiService.rate(assessmentId, message.id, next);
    } catch {
      /* keep the optimistic state – feedback is best effort */
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant' && !m.streaming);
  const suggestions = !sending && lastAssistant?.suggestions?.length ? lastAssistant.suggestions : [];

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

      {status?.checkin_due ? (
        <Pressable onPress={() => send(`Det har gått ${status.days_on_plan} dagar med min plan. Kan vi stämma av hur det går?`)} style={styles.checkin} accessibilityRole="button">
          <Icon name="calendar-check" size={22} color={colors.inkBrand} />
          <View style={styles.checkinText}>
            <T variant="bodyMedium">Dags för uppföljning</T>
            <T variant="caption" muted>Du har följt planen i {status.days_on_plan} dagar. Berätta hur det går så justerar jag planen.</T>
          </View>
          <Icon name="chevron-right" size={18} color={colors.inkMuted} />
        </Pressable>
      ) : null}

      <Bot text={'Hej! Jag heter Dermora, din personliga AI-hudexpert. ✨\n\nJag har analyserat dina bilder och svar, och är redo att hjälpa dig.'} />
      <Bot text="Här är en kort sammanfattning av din hud:" />
      {guidance ? (
        <View style={[styles.profileCard, narrow && styles.profileCardNarrow]}>
          <View style={styles.profileHead}>
            <T variant="bodyMedium">Din hudprofil</T>
            <Pressable onPress={() => navigation.navigate('Result', { assessmentId })} accessibilityRole="button" style={styles.detailsLink}>
              <T variant="small" color={colors.inkBrand}>Se detaljer</T>
              <Icon name="chevron-right" size={16} color={colors.inkBrand} />
            </Pressable>
          </View>
          <View style={styles.profileGrid}>
            <Fact icon="drop" label="Hudtyp" value={SKIN_LABEL[guidance.skin_type_estimate] ?? guidance.skin_type_estimate} wide={narrow} />
            <Fact icon="face" label="Huvudproblem" value={guidance.primary_concern} wide={narrow} />
            <Fact icon="skin-layers" label="Hudtextur" value={guidance.skin_texture || '–'} wide={narrow} />
            <Fact icon="bubbles" label="Känslighet" value={guidance.sensitivity || '–'} wide={narrow} />
          </View>
        </View>
      ) : null}
      <Bot text={'Vad vill du att vi fokuserar på idag?'} sub="Du kan ställa frågor, be om rekommendationer, skicka en ny bild eller få hjälp med en skräddarsydd hudvårdsrutin." />
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

  const footerList = (
    <View>
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={styles.suggestion} accessibilityRole="button">
              <T variant="caption" color={colors.inkBrand} style={styles.suggestionText}>{s}</T>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Disclaimer />
    </View>
  );

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View>
          {attachment ? (
            <View style={styles.attachRow}>
              <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
              <T variant="caption" muted style={styles.attachText}>Bild bifogad – skickas med nästa meddelande</T>
              <Pressable onPress={() => setAttachment(null)} accessibilityRole="button" accessibilityLabel="Ta bort bild"><Icon name="close" size={18} color={colors.inkMuted} /></Pressable>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <Pressable onPress={attachPhoto} disabled={attaching || sending} accessibilityRole="button" accessibilityLabel="Bifoga bild" style={styles.attachBtn}>
              {attaching ? <ActivityIndicator size="small" color={colors.inkBrand} /> : <Icon name="image" size={22} color={attachment ? colors.inkBrand : colors.inkMuted} />}
            </Pressable>
            <TextInput ref={input} value={draft} onChangeText={setDraft} placeholder="Skriv din fråga här …" placeholderTextColor={colors.inkMuted} style={styles.input} multiline maxLength={2000} accessibilityLabel="Meddelande" />
            <Pressable onPress={() => send(draft)} disabled={!draft.trim() || sending} style={[styles.send, (!draft.trim() || sending) && styles.sendOff]} accessibilityRole="button" accessibilityLabel="Skicka">
              {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Icon name="arrow-right" size={20} color={colors.onPrimary} strokeWidth={2.2} />}
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
        renderItem={({ item }) => <AIMessage message={item} onRate={item.role === 'assistant' && !item.streaming && !String(item.id).startsWith('err-') ? (r) => rate(item, r) : undefined} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        ListFooterComponent={footerList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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

function Fact({ icon, label, value, wide }: { icon: IconName; label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.fact, wide && styles.factWide]}>
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
  checkin: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.accent },
  checkinText: { flex: 1 },
  botRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMint },
  botBubble: { flex: 1, backgroundColor: colors.surfaceSunken, borderRadius: radius.lg, borderTopLeftRadius: 6, padding: spacing.md + 2, gap: 4 },
  profileCard: { marginLeft: 48, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  profileCardNarrow: { marginLeft: 0 },
  profileHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  detailsLink: { flexDirection: 'row', alignItems: 'center' },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { width: '48%', flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.sm },
  factWide: { width: '100%' },
  factIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  factText: { flex: 1 },
  factValue: { fontFamily: 'Montserrat-Medium' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.lg },
  quickBtn: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  quickLabel: { flex: 1, fontFamily: 'Montserrat-Medium' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md, marginLeft: 36 },
  suggestion: { backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  suggestionText: { fontFamily: 'Montserrat-Medium' },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.sm },
  attachThumb: { width: 36, height: 36, borderRadius: 8 },
  attachText: { flex: 1 },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceRaised, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, paddingLeft: spacing.sm, paddingRight: 6, paddingVertical: 6 },
  input: { ...typography.small, flex: 1, maxHeight: 100, paddingVertical: spacing.sm, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  cta: { marginTop: spacing.md },
});
