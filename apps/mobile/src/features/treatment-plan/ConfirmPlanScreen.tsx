/**
 * Design screen 14 – "Bekräfta din plan". Owner: Even.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Icon, ListRow, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { planService } from './services/planService';

export function ConfirmPlanScreen({ navigation, route }: AppScreenProps<'ConfirmPlan'>) {
  const { planId, assessmentId } = route.params;
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [agree, setAgree] = useState(false);
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
  return (
    <Screen
      footer={
        <View>
          <Button title="Bekräfta plan" onPress={confirm} disabled={!agree} loading={saving} />
          <Button title="Gå tillbaka" variant="ghost" onPress={() => navigation.goBack()} style={styles.gap} />
        </View>
      }
    >
      <T variant="h1" mb="xs">Bekräfta din plan</T>
      <T variant="small" muted mb="xl">Granska din personliga plan. Du kan gå tillbaka och göra ändringar om det behövs.</T>

      <Card>
        <View style={styles.cardHead}>
          <T variant="bodyMedium">Din personliga plan</T>
          <Pressable onPress={() => navigation.navigate('AIChat', { assessmentId })} accessibilityRole="button" style={styles.edit}>
            <Icon name="edit" size={14} color={colors.inkBrand} />
            <T variant="caption" color={colors.inkBrand}>Redigera</T>
          </Pressable>
        </View>
        {p ? (
          <>
            <ListRow icon="checklist" title="Huvudmål" subtitle={`${p.goals.length} mål`} trailing="none" />
            <ListRow icon="sun" title="Morgonrutin" subtitle={`${p.morning.length} steg`} trailing="none" />
            <ListRow icon="moon" title="Kvällsrutin" subtitle={`${p.evening.length} steg`} trailing="none" />
            <ListRow icon="flask" title="Nyckelingredienser" subtitle={`${p.key_ingredients.length} ingredienser`} trailing="none" />
            <ListRow icon="lightbulb" title="Ytterligare tips" subtitle={`${p.tips.length} rekommendationer`} trailing="none" />
          </>
        ) : null}
      </Card>

      <Pressable onPress={() => setAgree((a) => !a)} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
        <View style={[styles.checkbox, agree && styles.checkboxOn]}>{agree ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
        <T variant="caption" style={styles.agreeText}>
          Jag bekräftar att jag vill spara denna plan och använda den som min vägledning. Den är vägledning, inte medicinsk diagnos.
        </T>
      </Pressable>
      {error ? <T variant="small" color={colors.danger}>{error}</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agree: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText: { flex: 1 },
  gap: { marginTop: spacing.sm },
});
