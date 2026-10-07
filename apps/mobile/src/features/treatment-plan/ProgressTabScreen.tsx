/**
 * "Framsteg" tab – owner: Even. Routine log (morning/evening per day), streak and adherence,
 * progress photos over time with a before/after comparison, and a shortcut to the follow-up chat.
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Blob, Button, Icon, IconBadge, InfoPanel, Screen, T } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { dayKey, progressService } from '../../services/progress/progressService';
import { colors, radius, shadow, spacing } from '../../theme';
import type { ProgressData, RoutineSlot, SkinImage } from '../../types/api';

const WEEKDAYS = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86_400_000)));
  return out;
}

function weekday(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return WEEKDAYS[(d.getDay() + 6) % 7];
}

function dateLabel(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

export function ProgressTabScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [data, setData] = useState<ProgressData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    progressService.get().then(setData).catch(() => setData(null));
  }, []);
  useFocusEffect(load);

  const isDone = (day: string, slot: RoutineSlot) => !!data?.logs.find((l) => l.day === day && l.slot === slot && l.done);

  const toggle = async (day: string, slot: RoutineSlot) => {
    if (!data || busy) return;
    const next = !isDone(day, slot);
    setBusy(`${day}:${slot}`);
    setData({ ...data, logs: next ? [...data.logs.filter((l) => !(l.day === day && l.slot === slot)), { day, slot, done: 1, note: null }] : data.logs.filter((l) => !(l.day === day && l.slot === slot)) });
    try {
      await progressService.log(day, slot, next);
      load();
    } finally {
      setBusy(null);
    }
  };

  const today = dayKey();
  const days = lastDays(14);
  const photos = data?.photos ?? [];
  const first = photos[0];
  const latest = photos.length > 1 ? photos[photos.length - 1] : null;

  if (data && !data.plan) {
    return (
      <Screen>
        <Blob />
        <View style={styles.hero}>
          <IconBadge name="chart-bars" size={110} />
          <T variant="display" center style={styles.title}>Framsteg</T>
          <T variant="body" muted center>När du har bekräftat en hudvårdsplan kan du logga din rutin här, se din svit och jämföra bilder över tid.</T>
        </View>
        <Button title="Gör din hudanalys" onPress={() => navigation.navigate('AssessmentIntro')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Blob />
        <T variant="display" style={styles.heading}>Framsteg</T>
        {data?.plan ? <T variant="body" muted mb="lg">{data.plan.title} · dag {data.days_on_plan} av din plan</T> : <T variant="body" muted mb="lg">Laddar …</T>}

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <T variant="display" style={styles.statValue}>{data?.streak ?? 0}</T>
            <T variant="caption" muted>dagar i rad</T>
          </View>
          <View style={styles.stat}>
            <T variant="display" style={styles.statValue}>{data?.adherence_14d ?? 0}%</T>
            <T variant="caption" muted>rutiner gjorda, 14 dagar</T>
          </View>
          <View style={styles.stat}>
            <T variant="display" style={styles.statValue}>{Math.max(0, (data?.follow_up_days ?? 14) - (data?.days_on_plan ?? 0))}</T>
            <T variant="caption" muted>dagar till uppföljning</T>
          </View>
        </View>

        {data?.checkin_due ? (
          <Pressable onPress={() => data.plan?.assessment_id && navigation.navigate('AIChat', { assessmentId: data.plan.assessment_id })} style={styles.checkin} accessibilityRole="button">
            <Icon name="chat" size={22} color={colors.inkBrand} />
            <View style={styles.flex}>
              <T variant="bodyMedium">Dags för uppföljning med Dermora</T>
              <T variant="caption" muted>Berätta hur rutinen gått så justerar AI:n din plan.</T>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <T variant="bodyMedium">Din rutin idag</T>
            <T variant="caption" muted>{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
          </View>
          <View style={styles.todayRow}>
            {(['morning', 'evening'] as RoutineSlot[]).map((slot) => {
              const done = isDone(today, slot);
              return (
                <Pressable key={slot} onPress={() => toggle(today, slot)} style={[styles.todayBtn, done && styles.todayOn]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}>
                  <Icon name={slot === 'morning' ? 'sun' : 'moon'} size={22} color={done ? colors.onPrimary : colors.inkBrand} />
                  <T variant="small" color={done ? colors.onPrimary : colors.ink} style={styles.todayLabel}>{slot === 'morning' ? 'Morgonrutin' : 'Kvällsrutin'}</T>
                  <Icon name={done ? 'check' : 'plus'} size={16} color={done ? colors.onPrimary : colors.inkMuted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <T variant="bodyMedium" mb="sm">Senaste 14 dagarna</T>
          <View style={styles.grid}>
            {days.map((day) => {
              const m = isDone(day, 'morning');
              const e = isDone(day, 'evening');
              return (
                <View key={day} style={styles.dayCol}>
                  <T variant="caption" muted>{weekday(day)}</T>
                  <Pressable onPress={() => toggle(day, 'morning')} style={[styles.dot, m && styles.dotOn]} accessibilityRole="checkbox" accessibilityState={{ checked: m }} accessibilityLabel={`Morgon ${day}`} />
                  <Pressable onPress={() => toggle(day, 'evening')} style={[styles.dot, styles.dotEvening, e && styles.dotOn]} accessibilityRole="checkbox" accessibilityState={{ checked: e }} accessibilityLabel={`Kväll ${day}`} />
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={[styles.dot, styles.dotOn, styles.legendDot]} /><T variant="caption" muted>gjord</T>
            <View style={[styles.dot, styles.legendDot]} /><T variant="caption" muted>inte loggad · tryck för att ändra</T>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <T variant="bodyMedium">Dina bilder över tid</T>
            <T variant="caption" muted>{photos.length} st</T>
          </View>
          {first ? (
            <View style={styles.compare}>
              <PhotoCard image={first} label={`Start · ${dateLabel(first.created_at)}`} />
              {latest ? <PhotoCard image={latest} label={`Senast · ${dateLabel(latest.created_at)}`} /> : <View style={styles.photoPlaceholder}><Icon name="camera" size={26} color={colors.inkMuted} /><T variant="caption" muted center>Ta en ny bild var 4:e vecka i samma ljus</T></View>}
            </View>
          ) : (
            <T variant="small" muted>Inga bilder ännu. Bilder du laddar upp i analysen eller skickar i chatten samlas här.</T>
          )}
          {photos.length > 2 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.stripContent}>
              {photos.map((p) => (
                <View key={p.id} style={styles.stripItem}>
                  <Image source={{ uri: p.url ?? undefined }} style={styles.stripImg} />
                  <T variant="caption" muted center>{dateLabel(p.created_at)}</T>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <Button
            title="Ny uppföljningsbild i chatten  →"
            variant="ghost"
            style={styles.gap}
            onPress={() => data?.plan?.assessment_id && navigation.navigate('AIChat', { assessmentId: data.plan.assessment_id })}
          />
        </View>

        <InfoPanel title="Bra att veta" text="Resultat syns oftast efter 4–8 veckor vid konsekvent användning. Ett missat tillfälle spelar ingen roll – en missad vecka gör det." />
      </ScrollView>
    </Screen>
  );
}

function PhotoCard({ image, label }: { image: SkinImage; label: string }) {
  return (
    <View style={styles.photoCard}>
      <Image source={{ uri: image.url ?? undefined }} style={styles.photo} />
      <T variant="caption" muted center>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  hero: { alignItems: 'center', marginVertical: spacing.xxl },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
  heading: { fontSize: 30, lineHeight: 36, marginBottom: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 26, lineHeight: 30, color: colors.inkBrand },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1.5, borderColor: colors.accent, ...shadow.sm },
  card: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadow.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  todayRow: { flexDirection: 'row', gap: spacing.sm },
  todayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: spacing.sm + 2 },
  todayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  todayLabel: { flex: 1, fontFamily: 'Montserrat-Medium' },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.line },
  dotEvening: { borderStyle: 'dashed' },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  compare: { flexDirection: 'row', gap: spacing.sm },
  photoCard: { flex: 1, gap: 4 },
  photo: { width: '100%', aspectRatio: 0.85, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  photoPlaceholder: { flex: 1, aspectRatio: 0.85, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.sm },
  strip: { marginTop: spacing.sm },
  stripContent: { gap: spacing.sm },
  stripItem: { width: 72, gap: 2 },
  stripImg: { width: 72, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  gap: { marginTop: spacing.md },
});
