/**
 * "Plan" tab: the confirmed plan – owner: Even.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Disclaimer, Screen, T } from '../../components/ui';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { spacing } from '../../theme';
import type { TreatmentPlan } from '../../types/api';
import { TreatmentPlanCard } from './components/TreatmentPlanCard';
import { planService } from './services/planService';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Plan'>, NativeStackScreenProps<AppStackParamList>>;

export function SavedPlanScreen({ navigation }: Props) {
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
        <T variant="h1" mb="sm">Ingen plan ännu</T>
        <T muted mb="xl">Svara på frågorna och ta en bild så får du ett förslag på en plan som du kan bekräfta.</T>
        <Button title="Starta bedömning" onPress={() => navigation.navigate('Assessment', {})} />
      </Screen>
    );
  }

  const confirmed = plan.confirmed_at ? new Date(plan.confirmed_at).toLocaleDateString('sv-SE') : '';

  return (
    <Screen>
      <T variant="label" muted mb="xs">Din aktiva plan · bekräftad {confirmed}</T>
      <TreatmentPlanCard plan={plan.plan} />
      {plan.assessment_id ? (
        <Card>
          <T variant="h3" mb="sm">Frågor om planen?</T>
          <Button title="Öppna AI-chatten" variant="secondary" onPress={() => navigation.navigate('AIChat', { assessmentId: plan.assessment_id! })} />
        </Card>
      ) : null}
      <View style={styles.actions}>
        <Button title="Gör en ny bedömning" variant="ghost" onPress={() => navigation.navigate('Assessment', {})} />
      </View>
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({ actions: { marginTop: spacing.sm } });
