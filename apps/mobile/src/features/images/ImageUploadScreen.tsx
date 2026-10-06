/**
 * Image upload screen – owner: Ali. Design screen 9 ("Ladda upp initiala bilder").
 * Flow: pick/take → preview + quality check → upload → review grid (ImageReview) → analyze.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Icon, IconBadge, Screen, StepHeader, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, palette, radius, spacing } from '../../theme';
import type { FaceCheck } from '../../types/api';
import { ImagePicker } from './components/ImagePicker';
import { ImagePreview } from './components/ImagePreview';

const TIPS = ['Bra belysning (naturligt ljus)', 'Tydlig och skarp bild', 'Visa hela ansiktet', 'Ingen makeup om möjligt'];

export function ImageUploadScreen({ navigation, route }: AppScreenProps<'ImageUpload'>) {
  const { assessmentId } = route.params;
  const [consent, setConsent] = useState<boolean | null>(null);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [check, setCheck] = useState<FaceCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService.get().then((p) => setConsent(p.consent_images));
    imageStorageService.list(assessmentId).then((l) => setCount(l.length)).catch(() => undefined);
  }, [assessmentId]);

  const onPicked = async (uri: string) => {
    setPicking(false);
    setPending(uri);
    setCheck(null);
    setChecking(true);
    try {
      setCheck(await imageStorageService.check(uri));
    } catch {
      setCheck(null);
    } finally {
      setChecking(false);
    }
  };

  const upload = async () => {
    if (!pending) return;
    setUploading(true);
    setError(null);
    try {
      await imageStorageService.upload(pending, assessmentId, 'face');
      setPending(null);
      setCheck(null);
      navigation.navigate('ImageReview', { assessmentId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (consent === false) {
    return (
      <Screen>
        <StepHeader step={2} total={3} />
        <T variant="h1" mb="sm">Godkänn bildbehandling</T>
        <T muted mb="xl">För att analysera din hud behöver vi ditt godkännande att lagra bilderna privat. Du kan återkalla det när som helst.</T>
        <Button title="Till profilinställningar" onPress={() => navigation.navigate('EditProfile')} />
        <Button title="Fortsätt utan bild" variant="ghost" style={styles.gap} onPress={() => navigation.replace('Analyzing', { assessmentId })} />
      </Screen>
    );
  }

  if (pending) {
    return (
      <Screen>
        <StepHeader step={2} total={3} />
        <T variant="h1" mb="lg">Förhandsgranska</T>
        <ImagePreview uri={pending} check={check} checking={checking} onRetake={() => setPending(null)} onUse={upload} uploading={uploading} />
        {error ? <T color={colors.danger} style={styles.gap}>{error}</T> : null}
      </Screen>
    );
  }

  if (picking) {
    return (
      <Screen>
        <StepHeader step={2} total={3} />
        <T variant="h1" mb="lg">Ta en bild</T>
        <ImagePicker onPicked={onPicked} />
        <Button title="Avbryt" variant="ghost" onPress={() => setPicking(false)} style={styles.gap} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={count ? `Fortsätt (${count} bild${count > 1 ? 'er' : ''})` : 'Fortsätt utan bild'}
          variant={count ? 'primary' : 'ghost'}
          onPress={() => (count ? navigation.navigate('ImageReview', { assessmentId }) : navigation.replace('Analyzing', { assessmentId }))}
        />
      }
    >
      <StepHeader step={2} total={3} />
      <T variant="h1" mb="xs">Ladda upp initiala bilder</T>
      <T variant="small" muted mb="xl">Tydliga bilder hjälper vår AI att förstå din hud bättre och ge mer noggrann vägledning.</T>

      <Pressable onPress={() => setPicking(true)} style={styles.dropzone} accessibilityRole="button" accessibilityLabel="Ladda upp bilder eller ta en bild">
        <IconBadge name="camera" size={56} />
        <T variant="bodyMedium" center style={styles.dropTitle}>Tryck för att ladda upp bilder eller ta en bild</T>
        <T variant="caption" muted center>Du kan ladda upp upp till 4 bilder</T>
      </Pressable>

      <Card>
        <T variant="bodyMedium" mb="sm">Tips för bra bilder:</T>
        {TIPS.map((t) => (
          <View key={t} style={styles.tip}>
            <Icon name="check" size={16} color={colors.inkBrand} strokeWidth={2.5} />
            <T variant="small">{t}</T>
          </View>
        ))}
      </Card>
      <T variant="caption" muted center>
        Bilden lagras krypterat och privat. GPS-data tas bort innan den sparas. Ingen ansiktsigenkänning används.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: spacing.md },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: palette.tealLight,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMint,
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dropTitle: { marginTop: spacing.sm, maxWidth: 220 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
});
