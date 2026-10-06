/**
 * Review uploaded images – owner: Ali. Design screen 10 ("Granska dina bilder").
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Icon, Screen, StepHeader, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, palette, radius, spacing } from '../../theme';
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

  return (
    <Screen footer={<Button title="Fortsätt" onPress={() => navigation.replace('Analyzing', { assessmentId })} />}>
      <StepHeader step={2} total={3} />
      <T variant="h1" mb="xs">Granska dina bilder</T>
      <T variant="small" muted mb="xl">Kontrollera att bilderna är tydliga. Du kan ta bort eller lägga till fler.</T>

      <View style={styles.grid}>
        {images.map((img) => (
          <View key={img.id} style={styles.cell}>
            {img.url ? <Image source={{ uri: img.url }} style={styles.img} /> : <View style={styles.img} />}
            {img.face_check && !img.face_check.ok ? (
              <View style={styles.warn}>
                <Icon name="info" size={14} color={colors.onPrimary} />
              </View>
            ) : null}
            <Pressable onPress={() => remove(img.id)} style={styles.remove} accessibilityRole="button" accessibilityLabel="Ta bort bild">
              <Icon name="close" size={14} color={colors.onPrimary} strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
      </View>

      {images.length < 4 ? (
        <Button title="+ Lägg till en bild" variant="secondary" onPress={() => navigation.navigate('ImageUpload', { assessmentId })} />
      ) : null}
      {images.some((i) => i.face_check && !i.face_check.ok) ? (
        <T variant="caption" muted center style={styles.note}>
          Bilder markerade med i kan vara svåra att bedöma (suddiga, mörka eller utan tydligt ansikte).
        </T>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg },
  cell: { width: '48%', aspectRatio: 0.85, marginBottom: spacing.md },
  img: { width: '100%', height: '100%', borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  remove: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: palette.charcoal, alignItems: 'center', justifyContent: 'center' },
  warn: { position: 'absolute', bottom: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.attention, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: spacing.md },
});
