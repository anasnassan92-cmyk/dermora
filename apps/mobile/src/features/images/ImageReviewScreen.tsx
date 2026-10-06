/** Design screen 10 – Granska dina bilder (2×2 med etiketter, redigera/ta bort). Owner: Ali. */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Blob, FlowFooter, FlowHeader, Icon, InfoPanel, Screen, T } from '../../components/ui';
import { IMAGE_SLOTS } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, shadow, spacing } from '../../theme';
import type { SkinImage } from '../../types/api';

export function ImageReviewScreen({ navigation, route }: AppScreenProps<'ImageReview'>) {
  const { assessmentId } = route.params;
  const [images, setImages] = useState<SkinImage[]>([]);

  useFocusEffect(
    useCallback(() => {
      imageStorageService.list(assessmentId).then(setImages).catch(() => setImages([]));
    }, [assessmentId]),
  );

  const remove = async (id: string) => {
    await imageStorageService.remove(id);
    setImages((l) => l.filter((x) => x.id !== id));
  };

  const allOk = images.length > 0 && images.every((i) => !i.face_check || i.face_check.ok);
  const checks = [
    { ok: images.every((i) => !i.face_check || i.face_check.blur_score >= 60), text: 'Bilderna är i fokus' },
    { ok: images.every((i) => !i.face_check || (i.face_check.brightness >= 60 && i.face_check.brightness <= 215)), text: 'Bra belysning' },
    { ok: images.some((i) => i.area === 'face'), text: 'Hela ansiktet (och närbild) syns tydligt' },
  ];

  return (
    <Screen footer={<FlowFooter onBack={() => navigation.goBack()} onNext={() => navigation.replace('Analyzing', { assessmentId })} />}>
      <Blob />
      <FlowHeader step={3} onBack={() => navigation.goBack()} onSkip={() => navigation.replace('Analyzing', { assessmentId })} />
      <T variant="display" style={styles.title}>Granska dina bilder</T>
      <T variant="body" muted mb="xl">Kontrollera att bilderna är tydliga och att rätt vinklar har laddats upp.</T>

      <View style={styles.grid}>
        {IMAGE_SLOTS.map((s) => {
          const img = images.find((i) => i.area === s.area);
          const ok = !img?.face_check || img.face_check.ok;
          return (
            <View key={s.area} style={styles.cell}>
              <View style={styles.cellHead}>
                <T variant="bodyMedium">{s.label}</T>
                {img ? (
                  <View style={[styles.status, !ok && styles.statusWarn]}>
                    <Icon name={ok ? 'check' : 'info'} size={12} color={colors.onPrimary} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
              {img?.url ? (
                <View>
                  <Image source={{ uri: img.url }} style={styles.img} />
                  <View style={styles.actions}>
                    <Pressable onPress={() => navigation.navigate('ImageUpload', { assessmentId })} style={styles.action} accessibilityRole="button" accessibilityLabel={`Byt bild: ${s.label}`}>
                      <Icon name="edit" size={16} color={colors.ink} />
                    </Pressable>
                    <Pressable onPress={() => remove(img.id)} style={styles.action} accessibilityRole="button" accessibilityLabel={`Ta bort: ${s.label}`}>
                      <Icon name="trash" size={16} color={colors.ink} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => navigation.navigate('ImageUpload', { assessmentId })} style={styles.empty} accessibilityRole="button" accessibilityLabel={`Lägg till: ${s.label}`}>
                  <Icon name="plus" size={26} color={colors.inkBrand} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <InfoPanel title="Ser det bra ut?" text="Tydliga bilder hjälper vår AI att ge mer exakta och personliga rekommendationer.">
        <View style={styles.checklist}>
          {checks.map((c) => (
            <View key={c.text} style={styles.checkRow}>
              <View style={[styles.checkDot, !c.ok && styles.checkDotOff]}><Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /></View>
              <T variant="small" muted>{c.text}</T>
            </View>
          ))}
        </View>
      </InfoPanel>
      {!allOk ? <T variant="caption" muted center>Bilder markerade med i kan vara svåra att bedöma. Du kan ta om dem eller fortsätta ändå.</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.md },
  cell: { width: '48%', backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md, ...shadow.sm },
  cellHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingBottom: spacing.sm },
  status: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  statusWarn: { backgroundColor: colors.attention },
  img: { width: '100%', aspectRatio: 1.05, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  actions: { position: 'absolute', right: 6, bottom: 6, flexDirection: 'row', gap: 6 },
  action: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  empty: { width: '100%', aspectRatio: 1.05, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMint },
  checklist: { marginTop: spacing.sm, gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  checkDotOff: { backgroundColor: colors.borderControl },
});
