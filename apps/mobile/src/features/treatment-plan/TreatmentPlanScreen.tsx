/**
 * Review + confirm the AI-proposed plan – owner: Even.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Disclaimer, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { TreatmentPlanCard } from './components/TreatmentPlanCard';
import { planService } from './services/planService';

export function TreatmentPlanScreen({ navigation, route }: AppScreenProps<'TreatmentPlan'>) {
  const { assessmentId } = route.params;
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    planService
      .proposeFromAssessment(assessmentId)
      .then(setPlan)
      .catch((e: Error) => setError(e.message));
  }, [assessmentId]);

  const confirm = async () => {
    if (!plan) return;
    setConfirming(true);
    try {
      await planService.confirm(plan.id);
      navigation.popToTop();
      navigation.navigate('Tabs');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  if (!plan) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>{error ? <T color={colors.danger} center>{error}</T> : <ActivityIndicator color={colors.accent} />}</View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View>
          <Button title="Bekräfta och spara planen" onPress={confirm} loading={confirming} />
          <Button title="Jag vill fråga något först" variant="ghost" onPress={() => navigation.navigate('AIChat', { assessmentId })} style={styles.gap} />
        </View>
      }
    >
      <T variant="label" muted mb="xs">Förslag till plan</T>
      <T variant="h1" mb="lg">Granska din plan</T>
      <TreatmentPlanCard plan={plan.plan} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gap: { marginTop: spacing.md },
});
