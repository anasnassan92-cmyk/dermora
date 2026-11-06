/** Full view of the confirmed plan ("Min plan"). Owner: Even. */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Disclaimer, Icon, InfoPanel, Screen, T } from '../../components/ui';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { colors, palette, radius, shadow, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { showMessage } from '../../utils/dialog';
import { assessmentService } from '../assessment/services/assessmentService';
import { RoutineStepStrip } from './components/RoutineStepCard';
import { planService } from './services/planService';

/** "Min plan" is a tab without its own button (the bottom menu stays visible), opened from Hem or Profil. */
type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Plan'>, NativeStackScreenProps<AppStackParamList>>;

export function SavedPlanScreen({ navigation }: Props) {
  const [plan, setPlan] = useState<TreatmentPlan | null | undefined>(undefined);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      planService.active().then(setPlan).catch(() => setPlan(null));
    }, []),
  );

  /** Back to the page the plan was opened from (Hem or Profil). */
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Profile'));

  /** Same as Profil → "Ny analys med nya bilder": the answers are reused, only new photos are uploaded. */
  const newPhotos = async () => {
    setStarting(true);
    try {
      const a = await assessmentService.createFromLatest();
      navigation.navigate('ImageUpload', { assessmentId: a.id });
    } catch (e) {
      showMessage('Kunde inte starta', (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Tillbaka" style={styles.back}>
        <Icon name="chevron-left" size={26} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
      <T variant="h3" style={styles.headerTitle}>Min plan</T>
      <View style={styles.back} />
    </View>
  );

  if (plan === undefined) return <Screen>{header}<T muted>Laddar …</T></Screen>;

  if (!plan) {
    return (
      <Screen>
        {header}
        <T variant="display" style={styles.title}>Ingen plan ännu</T>
        <T variant="body" muted mb="xl">Gör en hudanalys så får du din personliga plan direkt.</T>
        <Button title="Starta hudanalys  →" onPress={() => navigation.navigate('AssessmentIntro')} />
      </Screen>
    );
  }

  const p = plan.plan;
  const confirmed = plan.confirmed_at ? new Date(plan.confirmed_at).toLocaleDateString('sv-SE') : '';

  return (
    <Screen>
      {header}
      <T variant="label" muted mb="xs">Aktiv plan · sedan {confirmed}</T>
      <T variant="display" style={styles.title}>{plan.title}</T>
      <T variant="body" muted mb="lg">{plan.summary}</T>

      <View style={styles.goals}>
        <View style={styles.goalsIcon}><Icon name="award" size={24} color={colors.inkBrand} /></View>
        <View style={styles.goalsText}>
          <T variant="bodyMedium">Dina huvudsakliga mål</T>
          {p.goals.map((g) => (
            <T key={g} variant="small" muted>• {g}</T>
          ))}
        </View>
      </View>

      <Section title="Morgonrutin" icon="sun" bg={palette.sun} ink={palette.sunInk} count={p.morning.length}><RoutineStepStrip steps={p.morning} tone="sun" /></Section>
      <Section title="Kvällsrutin" icon="moon" bg={palette.lavender} ink={palette.lavenderInk} count={p.evening.length}><RoutineStepStrip steps={p.evening} tone="moon" /></Section>
      {p.weekly.length ? <Section title="Veckoplan" icon="calendar" bg={colors.surfaceMint} ink={colors.inkBrand} count={p.weekly.length}><RoutineStepStrip steps={p.weekly} tone="week" /></Section> : null}

      <View style={styles.card}>
        <T variant="h3" mb="sm">Nyckelingredienser</T>
        {p.key_ingredients.map((k) => <Bullet key={k} text={k} />)}
      </View>
      <View style={styles.card}>
        <T variant="h3" mb="sm">Ytterligare tips</T>
        {p.tips.map((k) => <Bullet key={k} text={k} />)}
        {p.avoid.map((k) => <Bullet key={k} text={`Undvik: ${k}`} />)}
      </View>

      <InfoPanel title="Vad du kan förvänta dig" text={`${p.expectations} Uppföljning med ny bild om ${p.follow_up_days} dagar.`} />
      <Button title="Chatta om planen" variant="secondary" onPress={() => navigation.navigate('Chat')} />
      <Button title="Uppdatera med nya bilder" variant="ghost" onPress={newPhotos} loading={starting} style={styles.gap} />
      <Disclaimer />
    </Screen>
  );
}

function Section({ title, icon, bg, ink, count, children }: { title: string; icon: 'sun' | 'moon' | 'calendar'; bg: string; ink: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: bg }]}><Icon name={icon} size={22} color={ink} /></View>
        <T variant="h3" style={styles.sectionTitle}>{title}</T>
        <View style={styles.count}><T variant="caption" color={colors.inkBrand}>{count} steg</T></View>
      </View>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <T variant="small" style={styles.bulletText}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 32, marginBottom: spacing.lg },
  back: { width: 36, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', marginBottom: 0 },
  title: { fontSize: 28, lineHeight: 34, marginBottom: spacing.xs },
  goals: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  goalsIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  goalsText: { flex: 1 },
  card: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  sectionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, marginBottom: 0 },
  count: { backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  bullet: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
  bulletText: { flex: 1 },
  gap: { marginTop: spacing.sm },
});
