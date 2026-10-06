/** Design screen 11 – "AI-analys pågår". Owner: Youssef. */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Blob, Button, Card, FlowHeader, Icon, InfoPanel, Screen, T } from '../../components/ui';
import { DESIGN, IMAGE_SLOTS } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, shadow, spacing } from '../../theme';
import type { SkinImage } from '../../types/api';

const STEPS = [
  { title: 'Analyserar hudstruktur', text: 'Vi undersöker porer, textur och hudton …' },
  { title: 'Identifierar hudproblem', text: 'Vi analyserar akne, pigmentering, rodnad och mer …' },
  { title: 'Jämför med huddata', text: 'Vi matchar dina resultat med dermatologisk kunskap …' },
  { title: 'Skapar personliga rekommendationer', text: 'Vi tar fram din skräddarsydda hudvårdsrutin …' },
];

const isPreview = () => typeof window !== 'undefined' && !!window.location && new URLSearchParams(window.location.search).has('preview');

export function AnalyzingScreen({ navigation, route }: AppScreenProps<'Analyzing'>) {
  const { assessmentId } = route.params;
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(10);
  const [images, setImages] = useState<SkinImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      imageStorageService.list(assessmentId).then(setImages).catch(() => undefined);
    }, [assessmentId]),
  );

  useEffect(() => {
    if (isPreview()) {
      setPct(40);
      return;
    }
    const t = setInterval(() => {
      setPct((p) => Math.min(p + 7, 95));
      setActive((s) => Math.min(s + (Math.random() > 0.5 ? 1 : 0), STEPS.length - 1));
    }, 1500);
    aiService
      .analyze(assessmentId)
      .then(() => navigation.replace('AIChat', { assessmentId }))
      .catch((e: Error) => setError(e.message))
      .finally(() => clearInterval(t));
    return () => clearInterval(t);
  }, [assessmentId, navigation]);

  const front = images.find((i) => i.area === 'face');
  const thumb = (area: string) => images.find((i) => i.area === area)?.url ?? null;

  return (
    <Screen>
      <Blob />
      <FlowHeader step={3} onBack={() => navigation.goBack()} />
      <T variant="display" style={styles.title}>AI-analys pågår</T>
      <T variant="body" muted mb="xl">Vi analyserar dina bilder med hjälp av avancerad AI för att förstå din hud och ge personliga rekommendationer.</T>

      <View style={styles.visual}>
        <View style={styles.corner}><Thumb uri={thumb('face')} label="Framifrån" fallback="example-front" /></View>
        <View style={styles.corner}><Thumb uri={thumb('left')} label="Vänster sida" fallback="example-left" /></View>
        <View style={styles.center}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Image source={front?.url ? { uri: front.url } : DESIGN['analyze-center']} style={styles.centerImg} />
            </View>
          </View>
        </View>
        <View style={styles.corner}><Thumb uri={thumb('right')} label="Höger sida" fallback="example-right" /></View>
        <View style={styles.corner}><Thumb uri={thumb('closeup')} label="Närbild" fallback="example-closeup" /></View>
      </View>

      {error ? (
        <Card tone="danger">
          <T variant="bodyMedium" mb="xs">Något gick fel</T>
          <T variant="small" mb="md">{error}</T>
          <Button title="Försök igen" onPress={() => navigation.replace('Analyzing', { assessmentId })} />
        </Card>
      ) : (
        <View style={styles.steps}>
          {STEPS.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'todo';
            return (
              <View key={s.title} style={[styles.step, state === 'active' && styles.stepActive]}>
                <View style={[styles.stepIcon, state === 'done' && styles.stepIconDone]}>
                  {state === 'done' ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={3} /> : <Icon name="clock" size={20} color={state === 'active' ? colors.inkBrand : colors.inkMuted} />}
                </View>
                <View style={styles.stepText}>
                  <T variant="bodyMedium">{s.title}</T>
                  <T variant="caption" muted>{s.text}</T>
                </View>
                <T variant="small" color={state === 'active' ? colors.inkBrand : colors.inkMuted}>{state === 'done' ? 'Klar' : state === 'active' ? `${pct}%` : 'Väntar'}</T>
              </View>
            );
          })}
        </View>
      )}

      <InfoPanel title="Det här tar vanligtvis 1–2 minuter" text="Du kan stanna kvar på den här sidan medan vi slutför analysen." />
    </Screen>
  );
}

function Thumb({ uri, label, fallback }: { uri: string | null; label: string; fallback: string }) {
  return (
    <View style={styles.thumbWrap}>
      <Image source={uri ? { uri } : DESIGN[fallback]} style={styles.thumb} />
      <View style={styles.thumbLabel}>
        <View style={styles.thumbCheck}><Icon name="check" size={9} color={colors.onPrimary} strokeWidth={3} /></View>
        <T variant="caption">{label}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, marginBottom: spacing.xs },
  visual: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  corner: { width: '28%', marginBottom: spacing.md },
  center: { width: '40%', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '30%', top: '14%' },
  ringOuter: { width: 150, height: 150, borderRadius: 75, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 124, height: 124, borderRadius: 62, borderWidth: 3, borderColor: colors.accent, overflow: 'hidden' },
  centerImg: { width: '100%', height: '100%' },
  thumbWrap: { alignItems: 'center', gap: 4 },
  thumb: { width: '100%', aspectRatio: 0.95, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  thumbLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumbCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  steps: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.lg, ...shadow.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  stepActive: { backgroundColor: '#F2FAF8' },
  stepIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepText: { flex: 1 },
});
