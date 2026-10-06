/**
 * Home tab – shared UI (Even). Entry point into the MVP journey and a summary
 * of the active plan.
 */
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, T } from '../../components/ui';
import { Screen } from '../../components/ui';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { assessmentService } from '../assessment/services/assessmentService';
import { profileService } from '../../services/profile/profileService';
import { colors, spacing } from '../../theme';
import type { Assessment, Profile, TreatmentPlan } from '../../types/api';
import { planService } from './services/planService';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>, NativeStackScreenProps<AppStackParamList>>;

export function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [latest, setLatest] = useState<Assessment | null>(null);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => undefined);
      planService.active().then(setPlan).catch(() => setPlan(null));
      assessmentService.list().then((l) => setLatest(l[0] ?? null)).catch(() => undefined);
    }, []),
  );

  const firstName = profile?.display_name?.split(' ')[0];
  const draft = latest && latest.status === 'draft' ? latest : null;

  return (
    <Screen>
      <View style={styles.top}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="small" muted>Hej{firstName ? ` ${firstName}` : ''} 👋</T>
      </View>
      <T variant="h1" mb="lg">{plan ? 'Din plan är igång' : 'Låt oss förstå din hud'}</T>

      {plan ? (
        <Card tone="mint">
          <T variant="label" muted mb="xs">Aktiv plan</T>
          <T variant="h3" mb="xs">{plan.title}</T>
          <T variant="small" muted mb="md">{plan.summary}</T>
          <Button title="Visa planen" variant="secondary" onPress={() => navigation.navigate('Plan')} />
        </Card>
      ) : (
        <Card tone="mint">
          <T variant="h3" mb="xs">Få din första personliga plan</T>
          <T variant="small" muted mb="md">Svara på några frågor, ta en bild och få vägledning och en plan som du själv bekräftar. Tar ungefär fem minuter.</T>
          <Button title={draft ? 'Fortsätt bedömningen' : 'Starta bedömning'} onPress={() => navigation.navigate('Assessment', draft ? { assessmentId: draft.id } : {})} />
        </Card>
      )}

      {!profile?.consent_images ? (
        <Card>
          <T variant="h3" mb="xs">Godkänn bildbehandling</T>
          <T variant="small" muted mb="md">För att analysera din hud behöver vi ditt godkännande att lagra bilder privat.</T>
          <Button title="Till profilen" variant="ghost" onPress={() => navigation.navigate('EditProfile')} />
        </Card>
      ) : null}

      <Card>
        <T variant="h3" mb="sm">Så fungerar Dermora</T>
        <Step n={1} text="Berätta om din hud" />
        <Step n={2} text="Ta en bild – privat och krypterad" />
        <Step n={3} text="Få vägledning och ställ frågor" />
        <Step n={4} text="Bekräfta din plan och följ den" />
      </Card>
    </Screen>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}><T variant="caption" color={colors.onPrimary}>{n}</T></View>
      <T variant="small">{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  symbol: { width: 36, height: 31 },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
