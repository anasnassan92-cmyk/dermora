/**
 * Onboarding step 1/3 – "Berätta om dig själv" (design screen 4). Owner: Anas.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Icon, Screen, StepHeader, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { colors, radius, spacing } from '../../theme';
import type { AgeRange, Gender } from '../../types/api';

const AGES: { value: AgeRange; label: string }[] = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18 – 24' },
  { value: '25_34', label: '25 – 34' },
  { value: '35_44', label: '35 – 44' },
  { value: '45_54', label: '45 – 54' },
  { value: '55_plus', label: '55+' },
];
const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Kvinna' },
  { value: 'male', label: 'Man' },
  { value: 'non_binary', label: 'Icke-binär' },
  { value: 'undisclosed', label: 'Vill inte uppge' },
];

export function ProfileSetupScreen({ navigation }: AppScreenProps<'ProfileSetup'>) {
  const [age, setAge] = useState<AgeRange | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.get().then((p) => {
      setAge(p.age_range);
      setGender(p.gender);
    });
  }, []);

  const next = async () => {
    setSaving(true);
    try {
      await profileService.update({ age_range: age ?? undefined, gender: gender ?? undefined, country: 'SE' });
      navigation.navigate('AssessmentIntro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<Button title="Fortsätt" onPress={next} disabled={!age} loading={saving} />}>
      <StepHeader step={1} total={3} />
      <T variant="h1" mb="xs">Berätta om dig själv</T>
      <T variant="small" muted mb="xl">Detta hjälper oss att ge mer relevant vägledning.</T>

      <T variant="bodyMedium" mb="sm">Åldersintervall</T>
      <View style={styles.chips}>
        {AGES.map((a) => (
          <Chip key={a.value} label={a.label} selected={age === a.value} onPress={() => setAge(a.value)} />
        ))}
      </View>

      <T variant="bodyMedium" mb="sm" style={styles.section}>
        Kön <T variant="small" muted>(valfritt)</T>
      </T>
      <View style={styles.chips}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(gender === g.value ? null : g.value)} />
        ))}
      </View>

      <T variant="bodyMedium" mb="sm" style={styles.section}>
        Plats <T variant="small" muted>(valfritt)</T>
      </T>
      <View style={styles.select} accessibilityRole="button" accessibilityLabel="Plats: Sverige">
        <T variant="body">🇸🇪  Sverige</T>
        <Icon name="chevron-down" size={18} color={colors.inkMuted} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  section: { marginTop: spacing.md },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
