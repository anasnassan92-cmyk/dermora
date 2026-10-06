import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button, Chip, Input, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { colors, spacing } from '../../theme';
import type { SkinType } from '../../types/api';

const SKIN_TYPES: { value: SkinType; label: string }[] = [
  { value: 'oily', label: 'Fet' },
  { value: 'dry', label: 'Torr' },
  { value: 'combination', label: 'Blandhud' },
  { value: 'normal', label: 'Normal' },
  { value: 'sensitive', label: 'Känslig' },
  { value: 'unknown', label: 'Vet inte' },
];

export function EditProfileScreen({ navigation }: AppScreenProps<'EditProfile'>) {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [skinType, setSkinType] = useState<SkinType>('unknown');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService.get().then((p) => {
      setName(p.display_name ?? '');
      setBirthYear(p.birth_year ? String(p.birth_year) : '');
      setSkinType(p.skin_type);
      setConsent(p.consent_images);
    });
  }, []);

  const save = async () => {
    setError(null);
    const year = birthYear ? Number(birthYear) : null;
    if (year !== null && (Number.isNaN(year) || year < 1900 || year > 2100)) return setError('Ange ett giltigt födelseår.');
    setSaving(true);
    try {
      await profileService.update({ display_name: name.trim() || null, birth_year: year, skin_type: skinType, consent_images: consent });
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Spara" onPress={save} loading={saving} />}>
      <T variant="h1" mb="xl">Grundprofil</T>
      <Input label="Namn" value={name} onChangeText={setName} />
      <Input label="Födelseår" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" maxLength={4} error={error} hint="Valfritt – hjälper vägledningen" />

      <T variant="small" style={styles.label}>Hudtyp (så som du uppfattar den)</T>
      <View style={styles.chips}>
        {SKIN_TYPES.map((s) => (
          <Chip key={s.value} label={s.label} selected={skinType === s.value} onPress={() => setSkinType(s.value)} />
        ))}
      </View>

      <View style={styles.consentRow}>
        <View style={styles.consentText}>
          <T variant="bodyMedium">Bildbehandling</T>
          <T variant="caption" muted>
            Jag godkänner att Dermora lagrar mina hudbilder privat och använder dem för min egen vägledning. Kan återkallas när som helst.
          </T>
        </View>
        <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.accent }} accessibilityLabel="Godkänn bildbehandling" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Montserrat-Medium', marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceMint, borderRadius: 16, padding: spacing.lg },
  consentText: { flex: 1 },
});
