import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Card, T } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import type { FaceCheck } from '../../../types/api';

interface Props {
  uri: string;
  check?: FaceCheck | null;
  checking?: boolean;
  onRetake: () => void;
  onUse: () => void;
  uploading?: boolean;
}

export function ImagePreview({ uri, check, checking, onRetake, onUse, uploading }: Props) {
  const bad = check && !check.ok;
  return (
    <View>
      <Image source={{ uri }} style={styles.image} accessibilityLabel="Förhandsvisning av din bild" />
      {checking ? (
        <T variant="small" muted center mb="lg">Kontrollerar bildkvalitet …</T>
      ) : bad ? (
        <Card tone="attention">
          <T variant="h3" mb="sm">Bilden kan bli svår att bedöma</T>
          {check!.reasons.map((r) => (
            <T key={r} variant="small" mb="xs">• {r}</T>
          ))}
        </Card>
      ) : check ? (
        <Card tone="mint">
          <T variant="small">Bra bild – ett ansikte, skarp och tillräckligt ljus.</T>
        </Card>
      ) : null}
      <Button title={bad ? 'Använd ändå' : 'Använd bilden'} variant={bad ? 'secondary' : 'primary'} onPress={onUse} loading={uploading} />
      <Button title="Ta om" variant="ghost" onPress={onRetake} style={styles.gap} />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg, marginBottom: spacing.lg, backgroundColor: colors.surfaceSunken },
  gap: { marginTop: spacing.md },
});
