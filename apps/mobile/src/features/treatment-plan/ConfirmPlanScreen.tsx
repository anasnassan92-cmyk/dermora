/** Design screen 14 – "Bekräfta din plan". Owner: Even. */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Blob, FlowFooter, FlowHeader, Icon, InfoPanel, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { colors, palette, radius, shadow, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { RoutineStepList } from './components/RoutineStepCard';
import { planService } from './services/planService';

export function ConfirmPlanScreen({ navigation, route }: AppScreenProps<'ConfirmPlan'>) {
  const { planId, assessmentId } = route.params;
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    planService.list().then((l) => setPlan(l.find((p) => p.id === planId) ?? null));
  }, [planId]);

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await planService.confirm(planId);
      navigation.replace('PlanSaved', { planId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const p = plan?.plan;
  const minutes = (steps: { duration?: string | null }[]) => `~ ${Math.max(1, Math.round(steps.length * 0.75))} minuter`;

  return (
    <Screen footer={<FlowFooter onBack={() => navigation.goBack()} onNext={confirm} nextLabel="Bekräfta plan" loading={saving} />}>
      <Blob />
      <FlowHeader step={4} onBack={() => navigation.goBack()} />
      <View style={styles.head}>
        <View style={styles.headText}>
          <T variant="display" style={styles.title}>Bekräfta din plan</T>
          <T variant="body" muted>Granska din personliga plan. Du kan gå tillbaka och göra ändringar om det behövs.</T>
        </View>
        <Image source={DESIGN['robot-plan']} style={styles.robot} resizeMode="contain" />
      </View>

      {p ? (
        <>
          <View style={styles.goals}>
            <View style={styles.goalsIcon}><Icon name="award" size={24} color={colors.inkBrand} /></View>
            <View style={styles.goalsText}>
              <T variant="bodyMedium">Dina huvudsakliga mål</T>
              <T variant="small" muted>{p.goals.join(', ').replace(/^./, (c) => c.toUpperCase())}.</T>
            </View>
            <Pressable onPress={() => navigation.navigate('AIChat', { assessmentId })} style={styles.editBtn} accessibilityRole="button">
              <T variant="caption" color={colors.inkBrand}>Redigera</T>
              <Icon name="edit" size={12} color={colors.inkBrand} />
            </Pressable>
          </View>

          <View style={styles.columns}>
            <View style={styles.col}>
              <View style={styles.colHead}>
                <View style={[styles.colIcon, { backgroundColor: palette.sun }]}><Icon name="sun" size={22} color={palette.sunInk} /></View>
                <View>
                  <T variant="bodyMedium">Morgonrutin</T>
                  <T variant="caption" muted>{p.morning.length} steg · {minutes(p.morning)}</T>
                </View>
              </View>
              <RoutineStepList steps={p.morning} />
            </View>
            <View style={styles.col}>
              <View style={styles.colHead}>
                <View style={[styles.colIcon, { backgroundColor: palette.lavender }]}><Icon name="moon" size={22} color={palette.lavenderInk} /></View>
                <View>
                  <T variant="bodyMedium">Kvällsrutin</T>
                  <T variant="caption" muted>{p.evening.length} steg · {minutes(p.evening)}</T>
                </View>
              </View>
              <RoutineStepList steps={p.evening} />
            </View>
          </View>

          <View style={styles.weekly}>
            <View style={[styles.colIcon, { backgroundColor: colors.surfaceMint }]}><Icon name="calendar" size={22} color={colors.inkBrand} /></View>
            <View style={styles.weeklyText}>
              <T variant="bodyMedium">Veckoplan</T>
              <T variant="caption" muted>{p.weekly.length} extra behandlingar per vecka</T>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkMuted} />
          </View>

          <View style={styles.products}>
            <T variant="h3">Rekommenderade produkttyper</T>
            <T variant="caption" muted mb="sm">Utvalda för din hudtyp och dina hudproblem.</T>
            {p.key_ingredients.map((k) => (
              <View key={k} style={styles.ingredient}>
                <View style={styles.ingredientDot}><Icon name="check" size={11} color={colors.onPrimary} strokeWidth={3} /></View>
                <T variant="small" style={styles.ingredientText}>{k}</T>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <InfoPanel text="Resultat syns oftast efter 4–8 veckor vid konsekvent användning. Vi justerar planen kontinuerligt baserat på dina uppföljande bilder. Planen är vägledning, inte medicinsk diagnos." />
      {error ? <T variant="small" color={colors.danger}>{error}</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  headText: { flex: 1.4 },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  robot: { width: 110, height: 120 },
  goals: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  goalsIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  goalsText: { flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  columns: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  col: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.sm, ...shadow.sm },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  colIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  weekly: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  weeklyText: { flex: 1 },
  products: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  ingredientDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  ingredientText: { flex: 1 },
});
