/** Design screen 13 – "Din AI-föreslagna plan". Owner: Even. */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Blob, Disclaimer, FlowFooter, FlowHeader, Icon, InfoPanel, Screen, T, type IconName } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { colors, palette, radius, shadow, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { RoutineStepStrip } from './components/RoutineStepCard';
import { planService } from './services/planService';

type Tab = 'morning' | 'evening' | 'weekly';
const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'morning', label: 'Morgonrutin', icon: 'sun' },
  { key: 'evening', label: 'Kvällsrutin', icon: 'moon' },
  { key: 'weekly', label: 'Veckoplan', icon: 'calendar' },
];
const META: Record<Tab, { title: string; text: string; tone: 'sun' | 'moon' | 'week'; bg: string; ink: string }> = {
  morning: { title: 'Morgonrutin', text: 'Skyddar, balanserar och ger huden en bra start på dagen.', tone: 'sun', bg: palette.sun, ink: palette.sunInk },
  evening: { title: 'Kvällsrutin', text: 'Rengör på djupet, behandlar och återhämtar huden.', tone: 'moon', bg: palette.lavender, ink: palette.lavenderInk },
  weekly: { title: 'Veckoplan', text: 'Exfoliering, masker och extra behandlingar.', tone: 'week', bg: colors.surfaceMint, ink: colors.inkBrand },
};

export function TreatmentPlanScreen({ navigation, route }: AppScreenProps<'TreatmentPlan'>) {
  const { assessmentId } = route.params;
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [tab, setTab] = useState<Tab>('morning');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    planService.proposeFromAssessment(assessmentId).then(setPlan).catch((e: Error) => setError(e.message));
  }, [assessmentId]);

  if (!plan) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>{error ? <T color={colors.danger} center>{error}</T> : <ActivityIndicator color={colors.accent} />}</View>
      </Screen>
    );
  }
  const p = plan.plan;
  const steps = p[tab];
  const others = TABS.filter((t) => t.key !== tab);

  return (
    <Screen footer={<FlowFooter onBack={() => navigation.goBack()} onNext={() => navigation.navigate('ConfirmPlan', { planId: plan.id, assessmentId })} />}>
      <Blob />
      <FlowHeader step={4} onBack={() => navigation.goBack()} />
      <View style={styles.head}>
        <View style={styles.headText}>
          <T variant="display" style={styles.title}>Din AI-föreslagna plan</T>
          <T variant="body" muted>Baserat på din hudanalys har vi skapat en personlig hudvårdsrutin och rekommendationer för dina behov.</T>
        </View>
        <Image source={DESIGN['robot-plan']} style={styles.robot} resizeMode="contain" />
      </View>

      <View style={styles.goals}>
        <View style={styles.goalsIcon}><Icon name="award" size={24} color={colors.inkBrand} /></View>
        <View style={styles.goalsText}>
          <T variant="bodyMedium">Dina huvudsakliga mål</T>
          <T variant="small" muted>{p.goals.join(', ').replace(/^./, (c) => c.toUpperCase())}.</T>
        </View>
        <Pressable onPress={() => navigation.navigate('AIChat', { assessmentId })} style={styles.editBtn} accessibilityRole="button">
          <T variant="caption" color={colors.inkBrand}>Ändra mål</T>
          <Icon name="edit" size={12} color={colors.inkBrand} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} style={[styles.tab, tab === t.key && styles.tabOn]}>
            <Icon name={t.icon} size={16} color={tab === t.key ? colors.onPrimary : colors.ink} />
            <T variant="caption" color={tab === t.key ? colors.onPrimary : colors.ink} style={styles.tabLabel}>{t.label}</T>
          </Pressable>
        ))}
      </View>

      <View style={styles.routine}>
        <View style={styles.routineHead}>
          <View style={[styles.routineIcon, { backgroundColor: META[tab].bg }]}><Icon name={TABS.find((t) => t.key === tab)!.icon} size={24} color={META[tab].ink} /></View>
          <View style={styles.routineText}>
            <T variant="h3">{META[tab].title}</T>
            <T variant="caption" muted>{META[tab].text}</T>
          </View>
          <View style={styles.count}><T variant="caption" color={colors.inkBrand}>{steps.length} steg</T></View>
        </View>
        <RoutineStepStrip steps={steps} tone={META[tab].tone} />
      </View>

      {others.map((t) => (
        <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.otherRow} accessibilityRole="button">
          <View style={[styles.routineIcon, { backgroundColor: META[t.key].bg }]}><Icon name={t.icon} size={22} color={META[t.key].ink} /></View>
          <View style={styles.routineText}>
            <T variant="h3">{META[t.key].title}</T>
            <T variant="caption" muted>{META[t.key].text}</T>
          </View>
          <View style={styles.count}><T variant="caption" color={colors.inkBrand}>{p[t.key].length} steg</T></View>
          <Icon name="chevron-right" size={18} color={colors.inkMuted} />
        </Pressable>
      ))}

      <View style={styles.products}>
        <T variant="h3">Rekommenderade produkttyper</T>
        <T variant="caption" muted mb="sm">Utvalda för din hudtyp och dina hudproblem – ingredienser, inte varumärken.</T>
        {p.key_ingredients.map((k) => (
          <View key={k} style={styles.ingredient}>
            <View style={styles.ingredientDot}><Icon name="flask" size={12} color={colors.inkBrand} /></View>
            <T variant="small" style={styles.ingredientText}>{k}</T>
          </View>
        ))}
      </View>

      <InfoPanel text={p.expectations || 'Resultat syns oftast efter 4–8 veckor vid konsekvent användning.'} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  headText: { flex: 1.4 },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  robot: { width: 110, height: 120 },
  goals: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  goalsIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  goalsText: { flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceMint, borderRadius: radius.md, paddingVertical: spacing.md },
  tabOn: { backgroundColor: colors.accent },
  tabLabel: { fontFamily: 'Montserrat-Medium' },
  routine: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  routineHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  routineIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  routineText: { flex: 1 },
  count: { backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  products: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  ingredientDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  ingredientText: { flex: 1 },
});
