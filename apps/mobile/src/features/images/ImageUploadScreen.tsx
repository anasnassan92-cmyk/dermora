/**
 * Image upload screen – owner: Ali.
 * Flow: pick/take → preview + quality check → upload → (optionally more) → analyze.
 */
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, spacing } from '../../theme';
import type { FaceCheck, SkinImage } from '../../types/api';
import { ImagePicker } from './components/ImagePicker';
import { ImagePreview } from './components/ImagePreview';

export function ImageUploadScreen({ navigation, route }: AppScreenProps<'ImageUpload'>) {
  const { assessmentId } = route.params;
  const [consent, setConsent] = useState<boolean | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [check, setCheck] = useState<FaceCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<SkinImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService.get().then((p) => setConsent(p.consent_images));
    imageStorageService.list(assessmentId).then(setUploaded).catch(() => undefined);
  }, [assessmentId]);

  const onPicked = async (uri: string) => {
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
      const img = await imageStorageService.upload(pending, assessmentId, 'face');
      setUploaded((list) => [img, ...list]);
      setPending(null);
      setCheck(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (consent === false) {
    return (
      <Screen>
        <T variant="h1" mb="sm">Godkänn bildbehandling</T>
        <T muted mb="xl">För att analysera din hud behöver vi ditt godkännande att lagra bilderna privat. Du kan återkalla det när som helst.</T>
        <Button title="Till profilinställningar" onPress={() => navigation.navigate('EditProfile')} />
        <Button title="Fortsätt utan bild" variant="ghost" style={styles.gap} onPress={() => navigation.replace('Analyzing', { assessmentId })} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={uploaded.length ? 'Analysera min hud' : 'Fortsätt utan bild'}
          variant={uploaded.length ? 'primary' : 'ghost'}
          onPress={() => navigation.replace('Analyzing', { assessmentId })}
        />
      }
    >
      <T variant="h1" mb="sm">Ta en bild på din hud</T>
      <T muted mb="xl">En bild rakt framifrån räcker. Du kan lägga till fler områden om du vill.</T>

      {pending ? (
        <ImagePreview uri={pending} check={check} checking={checking} onRetake={() => setPending(null)} onUse={upload} uploading={uploading} />
      ) : (
        <ImagePicker onPicked={onPicked} />
      )}
      {error ? <T color={colors.danger} style={styles.gap}>{error}</T> : null}

      {uploaded.length ? (
        <View style={styles.uploaded}>
          <T variant="label" muted mb="sm">Uppladdade bilder ({uploaded.length})</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {uploaded.map((img) => (
              <View key={img.id} style={styles.thumbWrap}>
                {img.url ? <Image source={{ uri: img.url }} style={styles.thumb} /> : <View style={styles.thumb} />}
                <T variant="caption" muted onPress={() => imageStorageService.remove(img.id).then(() => setUploaded((l) => l.filter((x) => x.id !== img.id)))}>
                  Ta bort
                </T>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Card tone="mint" style={styles.privacy}>
        <T variant="small" muted>
          Bilden lagras krypterat och privat. GPS-data och annan metadata tas bort innan den sparas. Ingen ansiktsigenkänning används.
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: spacing.md },
  uploaded: { marginTop: spacing.xl },
  thumbWrap: { marginRight: spacing.md, alignItems: 'center', gap: spacing.xs },
  thumb: { width: 84, height: 112, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  privacy: { marginTop: spacing.xl },
});
