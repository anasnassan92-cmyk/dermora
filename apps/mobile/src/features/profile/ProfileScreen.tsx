/**
 * Profil – owner: Anas. Shows name, the situation summary, the confirmed plan and the account rows
 * (my answers & images, edit profile, change password / e-mail, delete data, log out).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Alert } from 'react-native';
import { Button, Card, Chip, ListRow, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { profileService } from '../../services/profile/profileService';
import { spacing } from '../../theme';
import type { Profile, SkinGuidance, TreatmentPlan } from '../../types/api';
import { assessmentService } from '../assessment/services/assessmentService';
import { planService } from '../treatment-plan/services/planService';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Profile'>, NativeStackScreenProps<AppStackParamList>>;

const SKIN_LABEL: Record<Profile['skin_type'], string> = {
  oily: 'Fet', dry: 'Torr', combination: 'Blandhud', normal: 'Normal', sensitive: 'Känslig', unknown: 'Ej angiven',
};
const SEVERITY_LABEL: Record<SkinGuidance['overall_severity'], string> = { none: 'Inga besvär', mild: 'Lindrigt', moderate: 'Måttligt', severe: 'Uttalat' };

/** The newest assessment that has been analysed (fallback: the newest one). */
export async function latestGuidance(): Promise<SkinGuidance | null> {
  const list = await assessmentService.list();
  const done = list.find((a) => a.status === 'analyzed') ?? list[0];
  if (!done) return null;
  const r = await aiService.latestResult(done.id).catch(() => null);
  return r?.result ?? null;
}

export function ProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guidance, setGuidance] = useState<SkinGuidance | null | undefined>(undefined);
  const [plan, setPlan] = useState<TreatmentPlan | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => setProfile(null));
      latestGuidance().then(setGuidance).catch(() => setGuidance(null));
      planService.active().then(setPlan).catch(() => setPlan(null));
    }, []),
  );

  const deleteData = () =>
    Alert.alert('Radera all min data?', 'Bilder, svar, bedömningar och planer tas bort permanent.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Radera',
        style: 'destructive',
        onPress: async () => {
          await profileService.deleteAllData();
          await signOut();
        },
      },
    ]);

  const name = profile?.display_name || session?.firstName || 'Din profil';

  /** New photos only – the answers from the first questionnaire are reused. */
  const newPhotos = async () => {
    try {
      const a = await assessmentService.createFromLatest();
      navigation.navigate('ImageUpload', { assessmentId: a.id });
    } catch (e) {
      Alert.alert('Kunde inte starta', (e as Error).message);
    }
  };

  return (
    <Screen>
      <T variant="h1" mb="xs">{name}</T>
      <T muted mb="md">{session?.email}</T>
      <View style={styles.chips}>
        <Chip label={`Hudtyp: ${profile ? SKIN_LABEL[profile.skin_type] : '…'}`} />
        {profile?.birth_year ? <Chip label={`Född ${profile.birth_year}`} /> : null}
        <Chip label={profile?.consent_images ? 'Bildbehandling: godkänd' : 'Bildbehandling: ej godkänd'} tone={profile?.consent_images ? 'success' : 'attention'} />
      </View>

      <Card>
        <T variant="label" muted mb="sm">Sammanfattning av läget</T>
        {guidance === undefined ? (
          <T muted>Hämtar…</T>
        ) : guidance ? (
          <>
            <View style={styles.chips}>
              <Chip label={`Hudtyp: ${SKIN_LABEL[guidance.skin_type_estimate] ?? guidance.skin_type_estimate}`} />
              <Chip label={guidance.primary_concern} />
              <Chip label={SEVERITY_LABEL[guidance.overall_severity] ?? guidance.overall_severity} tone={guidance.overall_severity === 'severe' ? 'danger' : guidance.overall_severity === 'moderate' ? 'attention' : 'success'} />
            </View>
            <T variant="body">{guidance.guidance}</T>
          </>
        ) : (
          <T muted>Ingen analys ännu. Gör en hudskanning så visas AI:ns sammanfattning här.</T>
        )}
      </Card>

      <Card tone="mint">
        <T variant="label" muted mb="sm">Min behandlingsplan</T>
        {plan === undefined ? (
          <T muted>Hämtar…</T>
        ) : plan ? (
          <>
            <T variant="h3" mb="xs">{plan.title}</T>
            {plan.summary ? <T variant="small" muted mb="md">{plan.summary}</T> : null}
            <Button title="Öppna min plan" variant="secondary" onPress={() => navigation.navigate('Plan')} />
          </>
        ) : (
          <T muted>Ingen bekräftad plan ännu. Planen visas här så fort du har accepterat AI:ns förslag.</T>
        )}
      </Card>

      <Card>
        <T variant="label" muted mb="sm">Mina uppgifter</T>
        <ListRow icon="document" title="Mina svar och bilder" subtitle="Formuläret du fyllde i (låst) och dina uppladdade bilder" onPress={() => navigation.navigate('MyInfo')} />
        {guidance ? (
          <ListRow icon="camera" title="Ny analys med nya bilder" subtitle="Dina svar behålls – ladda bara upp nya bilder så uppdateras din plan" onPress={newPhotos} />
        ) : (
          <ListRow icon="face-scan" title="Starta hudanalys" subtitle="Frågor, bilder och din personliga plan" onPress={() => navigation.navigate('AssessmentIntro')} />
        )}
        <ListRow icon="edit" title="Redigera profil" subtitle="Namn, födelseår, hudtyp" onPress={() => navigation.navigate('EditProfile')} />
        <ListRow icon="face" title="Grundprofil" subtitle="Ålder, kön, hudton" onPress={() => navigation.navigate('ProfileSetup')} />
      </Card>

      <Card>
        <T variant="label" muted mb="sm">Inloggning</T>
        <ListRow icon="lock" title="Byt lösenord" subtitle="Kräver ditt nuvarande lösenord" onPress={() => navigation.navigate('ChangePassword')} />
        <ListRow icon="mail" title="Byt e-postadress" subtitle={session?.email ?? ''} onPress={() => navigation.navigate('ChangeEmail')} />
      </Card>

      <Card tone="mint">
        <T variant="h3" mb="sm">Din data, dina regler</T>
        <T variant="small" muted mb="md">
          Dina bilder lagras privat och används bara för din egen vägledning. Du kan radera allt när som helst.
        </T>
        <Button title="Radera all min data" variant="ghost" onPress={deleteData} />
      </Card>

      <Button title="Logga ut" variant="ghost" onPress={signOut} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  logout: { marginTop: spacing.lg },
});
