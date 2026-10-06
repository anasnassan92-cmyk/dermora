/** "Skanna" tab – start a new AI analysis (design tab bar). Owner: Ali. */
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Blob, Button, InfoPanel, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { assessmentService } from '../assessment/services/assessmentService';
import { profileService } from '../../services/profile/profileService';
import { radius, spacing } from '../../theme';
import type { Assessment, Profile } from '../../types/api';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Scan'>, NativeStackScreenProps<AppStackParamList>>;

export function ScanTabScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Assessment | null>(null);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => undefined);
      assessmentService.list().then((l) => setDraft(l.find((a) => a.status === 'draft') ?? null)).catch(() => undefined);
    }, []),
  );

  const start = () => {
    if (draft) return navigation.navigate('Assessment', { assessmentId: draft.id });
    if (!profile?.age_range) return navigation.navigate('ProfileSetup');
    navigation.navigate('AssessmentIntro');
  };

  return (
    <Screen>
      <Blob />
      <T variant="display" style={styles.title}>Skanna din hud</T>
      <T variant="body" muted mb="xl">Svara på frågor, ladda upp bilder framifrån, från sidorna och en närbild – så får du en ny AI-analys och en uppdaterad plan.</T>
      <Image source={DESIGN['analyze-center']} style={styles.hero} />
      <Button title={draft ? 'Fortsätt bedömningen  →' : 'Starta ny analys  →'} onPress={start} />
      <View style={styles.gap} />
      <InfoPanel icon="shield-check" title="Privat och säkert" text="Bilderna lagras krypterat, GPS-data tas bort och ingen ansiktsigenkänning används. Dermora ger vägledning, inte medicinsk diagnos." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.xs, marginTop: spacing.md },
  hero: { width: '100%', aspectRatio: 1.3, borderRadius: radius.xl, marginBottom: spacing.xl },
  gap: { height: spacing.lg },
});
