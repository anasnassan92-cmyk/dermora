/**
 * Design screen 09 – "Ladda upp bilder på din hud": four slots (framifrån, vänster, höger, närbild).
 * Owner: Ali. Each slot: pick/take → quality check → upload with its `area`.
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Blob, Button, FlowFooter, FlowHeader, Icon, InfoPanel, Screen, T } from '../../components/ui';
import { DESIGN, IMAGE_SLOTS } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { profileService } from '../../services/profile/profileService';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, spacing } from '../../theme';
import type { FaceCheck, ImageArea, SkinImage } from '../../types/api';
import { ImagePicker } from './components/ImagePicker';
import { ImagePreview } from './components/ImagePreview';

const TIPS = ['Ta bilder i naturligt ljus', 'Ha ett rent ansikte utan smink', 'Ladda upp tydliga och skarpa bilder', 'Visa hela ansiktet och närbilder av problemområden'];

export function ImageUploadScreen({ navigation, route }: AppScreenProps<'ImageUpload'>) {
  const { assessmentId } = route.params;
  const [consent, setConsent] = useState<boolean | null>(null);
  const [images, setImages] = useState<SkinImage[]>([]);
  const [slot, setSlot] = useState<ImageArea | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [check, setCheck] = useState<FaceCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then((p) => setConsent(p.consent_images));
      imageStorageService.list(assessmentId).then(setImages).catch(() => undefined);
    }, [assessmentId]),
  );

  const onPicked = async (uri: string) => {
    setPending(uri);
    setCheck(null);
    setChecking(true);
    try {
      setCheck(slot === 'closeup' ? null : await imageStorageService.check(uri));
    } catch {
      setCheck(null);
    } finally {
      setChecking(false);
    }
  };

  const upload = async () => {
    if (!pending || !slot) return;
    setUploading(true);
    setError(null);
    try {
      const existing = images.find((i) => i.area === slot);
      if (existing) await imageStorageService.remove(existing.id);
      const img = await imageStorageService.upload(pending, assessmentId, slot);
      setImages((l) => [img, ...l.filter((i) => i.area !== slot)]);
      setPending(null);
      setSlot(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const hasFront = images.some((i) => i.area === 'face');

  if (consent === false) {
    return (
      <Screen>
        <Blob />
        <FlowHeader step={3} onBack={() => navigation.goBack()} />
        <T variant="display" style={styles.title}>Godkänn bildbehandling</T>
        <T variant="body" muted mb="xl">För att analysera din hud behöver vi ditt godkännande att lagra bilderna privat. Bilderna används bara för din egen vägledning, GPS-data tas bort och du kan radera dem när som helst.</T>
        <Button
          title="Jag godkänner  →"
          onPress={async () => {
            await profileService.update({ consent_images: true });
            setConsent(true);
          }}
        />
        <Button title="Fortsätt utan bild" variant="ghost" style={styles.gap} onPress={() => navigation.replace('Analyzing', { assessmentId })} />
      </Screen>
    );
  }

  if (slot) {
    const label = IMAGE_SLOTS.find((s) => s.area === slot)?.label ?? '';
    return (
      <Screen>
        <Blob />
        <FlowHeader step={3} onBack={() => { setSlot(null); setPending(null); }} />
        <T variant="display" style={styles.title}>{label}</T>
        <T variant="body" muted mb="lg">{slot === 'closeup' ? 'Ta en närbild på det område du vill ha hjälp med.' : 'Håll ansiktet i ovalen i jämnt dagsljus.'}</T>
        {pending ? (
          <ImagePreview uri={pending} check={check} checking={checking} onRetake={() => setPending(null)} onUse={upload} uploading={uploading} />
        ) : (
          <ImagePicker onPicked={onPicked} />
        )}
        {error ? <T color={colors.danger} style={styles.gap}>{error}</T> : null}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <FlowFooter
          onBack={() => navigation.goBack()}
          onNext={() => (images.length ? navigation.navigate('ImageReview', { assessmentId }) : navigation.replace('Analyzing', { assessmentId }))}
          nextLabel={images.length ? 'Fortsätt' : 'Fortsätt utan bild'}
        />
      }
    >
      <Blob />
      <FlowHeader step={3} onBack={() => navigation.goBack()} onSkip={() => navigation.replace('Analyzing', { assessmentId })} />
      <T variant="display" style={styles.title}>Ladda upp bilder{'\n'}på din hud</T>
      <T variant="body" muted mb="xl">Bilderna hjälper vår AI att analysera din hud och ge mer personliga rekommendationer.</T>

      <View style={styles.examples}>
        <T variant="bodyMedium" mb="sm">Exempel på bra bilder</T>
        <View style={styles.slotRow}>
          {IMAGE_SLOTS.map((s) => (
            <View key={s.area} style={styles.slotCol}>
              <Image source={DESIGN[s.example]} style={styles.exampleImg} />
              <T variant="caption" center>{s.label}</T>
            </View>
          ))}
        </View>
      </View>

      <T variant="bodyMedium" mb="sm">Dina bilder</T>
      <View style={styles.slotRow}>
        {IMAGE_SLOTS.map((s) => {
          const img = images.find((i) => i.area === s.area);
          return (
            <View key={s.area} style={styles.slotCol}>
              <Pressable onPress={() => setSlot(s.area)} accessibilityRole="button" accessibilityLabel={`${s.label}: ${img ? 'byt bild' : 'lägg till bild'}`} style={[styles.slot, img && styles.slotFilled]}>
                {img?.url ? <Image source={{ uri: img.url }} style={styles.slotImg} /> : <Icon name="camera" size={26} color={colors.inkMuted} />}
                {img ? <View style={styles.check}><Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /></View> : null}
              </Pressable>
              <T variant="caption" muted center>{s.label}</T>
            </View>
          );
        })}
      </View>
      {!hasFront && images.length ? <T variant="caption" color={colors.attention} mb="md">Lägg gärna till en bild framifrån – det ger den bästa analysen.</T> : null}

      <InfoPanel title="Tips för bästa resultat">
        {TIPS.map((t) => (
          <View key={t} style={styles.tip}>
            <View style={styles.tipDot}><Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /></View>
            <T variant="small" muted style={styles.tipText}>{t}</T>
          </View>
        ))}
      </InfoPanel>
      <T variant="caption" muted center>Bilderna lagras krypterat och privat. GPS-data tas bort. Ingen ansiktsigenkänning används.</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.xs },
  gap: { marginTop: spacing.md },
  examples: { backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl },
  slotRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  slotCol: { flex: 1, alignItems: 'center', gap: 6 },
  exampleImg: { width: '100%', aspectRatio: 0.82, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  slot: { width: '100%', aspectRatio: 0.95, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderControl, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotFilled: { borderStyle: 'solid', borderColor: colors.accent },
  slotImg: { width: '100%', height: '100%' },
  check: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  tipDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1 },
});
