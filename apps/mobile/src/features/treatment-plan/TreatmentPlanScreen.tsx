/**
 * Design screen 13 – "Din personliga plan" (AI-föreslagen). Owner: Even.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Disclaimer, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { TreatmentPlanCard } from './components/TreatmentPlanCard';
import { planService } from './services/planService';

export function TreatmentPlanScreen({ navigation, route }: AppScreenProps<'TreatmentPlan'>) {
  const { assessmentId } = route.params;
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    planService
      .proposeFromAssessment(assessmentId)
      .then(setPlan)
      .catch((e: Error) => setError(e.message));
  }, [assessmentId]);

  if (!plan) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>{error ? <T color={colors.danger} center>{error}</T> : <ActivityIndicator color={colors.accent} />}</View>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Fortsätt" onPress={() => navigation.navigate('ConfirmPlan', { planId: plan.id, assessmentId })} />}>
      <T variant="h1" mb="xs">Din personliga plan</T>
      <T variant="small" muted mb="xl">
        Baserat på dina svar, bilder och vår konversation har vi skapat en plan som är anpassad för just din hud.
      </T>
      <TreatmentPlanCard plan={plan.plan} compact />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
