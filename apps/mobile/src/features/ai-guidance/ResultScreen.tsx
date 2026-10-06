/**
 * AI result screen – owner: Youssef.
 * Shows the structured SkinGuidance: observations, guidance text, red flags.
 * From here the user can chat or go on to review the proposed plan.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Disclaimer, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, spacing } from '../../theme';
import type { Observation, Severity, SkinGuidance } from '../../types/api';

const AREA: Record<Observation['area'], string> = {
  forehead: 'Panna', nose: 'Näsa', left_cheek: 'Vänster kind', right_cheek: 'Höger kind', chin: 'Haka', jawline: 'Käklinje', overall: 'Helhet',
};
const SEVERITY: Record<Severity, { label: string; tone: 'success' | 'default' | 'attention' | 'danger' }> = {
  none: { label: 'Lugn', tone: 'success' },
  mild: { label: 'Mild', tone: 'default' },
  moderate: { label: 'Måttlig', tone: 'attention' },
  severe: { label: 'Kraftig', tone: 'danger' },
};

export function ResultScreen({ navigation, route }: AppScreenProps<'Result'>) {
  const { assessmentId } = route.params;
  const [g, setG] = useState<SkinGuidance | null>(null);

  useEffect(() => {
    aiService.latestResult(assessmentId).then((r) => setG(r?.result ?? null));
  }, [assessmentId]);

  if (!g) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <Button title="Fråga AI:n" variant="secondary" onPress={() => navigation.navigate('AIChat', { assessmentId })} style={styles.half} />
          <Button title="Se min plan" onPress={() => navigation.navigate('TreatmentPlan', { assessmentId })} style={styles.half} />
        </View>
      }
    >
      <T variant="label" muted mb="xs">Din bedömning</T>
      <T variant="h1" mb="md">{g.primary_concern}</T>
      <View style={styles.chips}>
        <Chip label={`Helhet: ${SEVERITY[g.overall_severity].label}`} tone={SEVERITY[g.overall_severity].tone} />
        <Chip label={`Hudtyp: ${g.skin_type_estimate}`} />
      </View>

      {g.seek_care ? (
        <Card tone="danger">
          <T variant="h3" mb="sm">Kontakta vården</T>
          {g.red_flags.map((f) => (
            <T key={f} variant="small" mb="xs">• {f}</T>
          ))}
          <T variant="small" muted style={styles.gap}>Vid snabb försämring, feber eller stark smärta: sök vård i dag.</T>
        </Card>
      ) : null}

      {g.image_quality_note ? (
        <Card tone="attention"><T variant="small">{g.image_quality_note}</T></Card>
      ) : null}

      <Card>
        <T variant="h3" mb="sm">Vad vi ser</T>
        {g.observations.map((o, i) => (
          <View key={i} style={styles.obs}>
            <View style={styles.obsHead}>
              <T variant="bodyMedium">{AREA[o.area]}</T>
              <Chip label={SEVERITY[o.severity].label} tone={SEVERITY[o.severity].tone} />
            </View>
            <T variant="small" muted>{o.finding} · säkerhet: {o.confidence === 'high' ? 'hög' : o.confidence === 'medium' ? 'medel' : 'låg'}</T>
          </View>
        ))}
      </Card>

      <Card tone="mint">
        <T variant="h3" mb="sm">Vägledning</T>
        <T>{g.guidance}</T>
      </Card>

      <Disclaimer text={g.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  obs: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  obsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gap: { marginTop: spacing.sm },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
