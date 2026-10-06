import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Chip, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { spacing } from '../../theme';
import type { Profile } from '../../types/api';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Profile'>, NativeStackScreenProps<AppStackParamList>>;

const SKIN_LABEL: Record<Profile['skin_type'], string> = {
  oily: 'Fet', dry: 'Torr', combination: 'Blandhud', normal: 'Normal', sensitive: 'Känslig', unknown: 'Ej angiven',
};

export function ProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => setProfile(null));
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

  return (
    <Screen>
      <T variant="h1" mb="xs">{profile?.display_name ?? 'Din profil'}</T>
      <T muted mb="xl">{session?.email}</T>

      <Card>
        <T variant="label" muted mb="sm">Hudprofil</T>
        <View style={styles.chips}>
          <Chip label={`Hudtyp: ${profile ? SKIN_LABEL[profile.skin_type] : '…'}`} />
          {profile?.birth_year ? <Chip label={`Född ${profile.birth_year}`} /> : null}
          <Chip label={profile?.consent_images ? 'Bildbehandling: godkänd' : 'Bildbehandling: ej godkänd'} tone={profile?.consent_images ? 'success' : 'attention'} />
        </View>
        <Button title="Grundprofil (ålder, kön, hudton)" variant="secondary" onPress={() => navigation.navigate('ProfileSetup')} style={styles.edit} />
        <Button title="Redigera profil" variant="ghost" onPress={() => navigation.navigate('EditProfile')} style={styles.edit} />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  edit: { marginTop: spacing.md },
  logout: { marginTop: spacing.lg },
});
