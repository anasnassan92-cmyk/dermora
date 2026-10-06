/** Design screen 04 – Grundprofil ("Berätta lite om dig"). Owner: Anas. */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

import { Blob, FlowFooter, FlowHeader, Icon, Screen, T, type IconName } from '../../components/ui';
import { DESIGN, SKIN_TONES } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { colors, radius, shadow, spacing } from '../../theme';
import type { AgeRange, Gender, SkinTone } from '../../types/api';

const AGES: { value: AgeRange; label: string }[] = [
  { value: 'under_18', label: 'Under 18 år' },
  { value: '18_24', label: '18–24 år' },
  { value: '25_34', label: '25–34 år' },
  { value: '35_44', label: '35–44 år' },
  { value: '45_54', label: '45–54 år' },
  { value: '55_plus', label: '55+ år' },
];
const GENDERS: { value: Gender; label: string; icon: IconName }[] = [
  { value: 'female', label: 'Kvinna', icon: 'user' },
  { value: 'male', label: 'Man', icon: 'user' },
  { value: 'non_binary', label: 'Annan', icon: 'user' },
];

export function ProfileSetupScreen({ navigation }: AppScreenProps<'ProfileSetup'>) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>('female');
  const [age, setAge] = useState<AgeRange>('25_34');
  const [ageOpen, setAgeOpen] = useState(false);
  const [tone, setTone] = useState<SkinTone | null>(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.get().then((p) => {
      if (p.gender) setGender(p.gender);
      if (p.age_range) setAge(p.age_range);
      if (p.skin_tone) setTone(p.skin_tone);
    });
  }, []);

  const pickPhoto = async () => {
    const res = await ExpoImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]?.uri) setPhoto(res.assets[0].uri);
  };

  const next = async () => {
    setSaving(true);
    try {
      await profileService.update({ age_range: age, gender: gender ?? undefined, country: 'SE', skin_tone: tone ?? undefined });
      navigation.navigate('AssessmentIntro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen footer={<FlowFooter onNext={next} loading={saving} />}>
      <Blob />
      <FlowHeader step={3} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('Tabs'))} onSkip={() => navigation.navigate('AssessmentIntro')} skipLabel="Skippa" />
      <T variant="display" style={styles.title}>Berätta lite om dig</T>
      <T variant="body" muted mb="xl">Detta hjälper oss att ge mer personliga rekommendationer.</T>

      <T variant="bodyMedium" mb="sm">Profilbild</T>
      <View style={styles.photoRow}>
        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Ladda upp profilbild">
          <Image source={photo ? { uri: photo } : DESIGN['profile-avatar']} style={styles.avatar} />
          <View style={styles.cameraBadge}><Icon name="camera" size={18} color={colors.onPrimary} /></View>
        </Pressable>
        <View style={styles.photoNote}>
          <T variant="bodyMedium">Ladda upp en profilbild (valfritt)</T>
          <T variant="caption" muted>Det hjälper oss att skapa en mer personlig upplevelse.</T>
        </View>
      </View>

      <T variant="bodyMedium" mb="sm">Kön</T>
      <View style={styles.genders}>
        {GENDERS.map((g) => (
          <Pressable key={g.value} onPress={() => setGender(g.value)} accessibilityRole="radio" accessibilityState={{ checked: gender === g.value }} style={[styles.gender, gender === g.value && styles.genderOn]}>
            <Icon name={g.icon} size={18} color={gender === g.value ? colors.inkBrand : colors.inkMuted} />
            <T variant="small" color={gender === g.value ? colors.inkBrand : colors.ink}>{g.label}</T>
          </Pressable>
        ))}
      </View>

      <T variant="bodyMedium" mb="sm">Ålder</T>
      <Pressable onPress={() => setAgeOpen((o) => !o)} style={styles.select} accessibilityRole="button" accessibilityLabel="Välj ålder">
        <T variant="body">{AGES.find((a) => a.value === age)?.label}</T>
        <Icon name={ageOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkMuted} />
      </Pressable>
      {ageOpen ? (
        <View style={styles.dropdown}>
          {AGES.map((a) => (
            <Pressable key={a.value} onPress={() => { setAge(a.value); setAgeOpen(false); }} style={styles.dropItem} accessibilityRole="menuitem">
              <T variant="body" color={a.value === age ? colors.inkBrand : colors.ink}>{a.label}</T>
            </Pressable>
          ))}
        </View>
      ) : null}

      <T variant="bodyMedium" mb="sm" style={styles.section}>Var bor du?</T>
      <View style={styles.select} accessibilityRole="button" accessibilityLabel="Land: Sverige">
        <T variant="body">Sverige</T>
        <Icon name="chevron-down" size={20} color={colors.inkMuted} />
      </View>

      <View style={[styles.toneHead, styles.section]}>
        <T variant="bodyMedium">Hudton</T>
        <Icon name="info" size={16} color={colors.inkMuted} />
      </View>
      <View style={styles.tones}>
        {SKIN_TONES.map((t) => (
          <Pressable key={t.value} onPress={() => setTone(t.value)} accessibilityRole="radio" accessibilityState={{ checked: tone === t.value }} accessibilityLabel={`Hudton ${t.value}`} style={[styles.toneRing, tone === t.value && styles.toneRingOn]}>
            <View style={[styles.tone, { backgroundColor: t.hex }]} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, marginBottom: spacing.xs },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceSunken },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  photoNote: { flex: 1, backgroundColor: colors.surfaceMint, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  genders: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  gender: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surfaceRaised },
  genderOn: { borderColor: colors.accent, backgroundColor: '#F2FAF8' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  dropdown: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginTop: spacing.xs, ...shadow.sm },
  dropItem: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  section: { marginTop: spacing.xl },
  toneHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tones: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  toneRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  toneRingOn: { borderColor: colors.accent },
  tone: { width: 38, height: 38, borderRadius: 19 },
});
