/** Full view of the confirmed plan ("Min plan"). Owner: Even. */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Disclaimer, Icon, InfoPanel, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, palette, radius, shadow, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { RoutineStepStrip } from './components/RoutineStepCard';
import { planService } from './services/planService';

export function SavedPlanScreen({ navigation }: AppScreenProps<'Plan'>) {
  const [plan, setPlan] = useState<TreatmentPlan | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      planService.active().then(setPlan).catch(() => setPlan(null));
    }, []),
  );

  if (plan === undefined) return <Screen><T muted>Laddar …</T></Screen>;

  if (!plan) {
    return (
      <Screen>
        <T variant="display" style={styles.title}>Ingen plan ännu</T>
        <T variant="body" muted mb="xl">Gör en hudanalys så får du ett förslag på en plan som du kan bekräfta.</T>
        <Button title="Starta hudanalys  →" onPress={() => navigation.navigate('AssessmentIntro')} />
      </Screen>
    );
  }

  const p = plan.plan;
  const confirmed = plan.confirmed_at ? new Date(plan.confirmed_at).toLocaleDateString('sv-SE') : '';

  return (
    <Screen>
      <T variant="label" muted mb="xs">Aktiv plan · bekräftad {confirmed}</T>
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
      {plan.assessment_id ? <Button title="Chatta om planen" variant="secondary" onPress={() => navigation.navigate('AIChat', { assessmentId: plan.assessment_id! })} /> : null}
      <Button title="Gör en ny hudanalys" variant="ghost" onPress={() => navigation.navigate('AssessmentIntro')} style={styles.gap} />
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
