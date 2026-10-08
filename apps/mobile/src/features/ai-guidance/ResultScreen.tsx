/**
 * Result – the one page after the analysis. Owner: Youssef.
 * Shows the structured SkinGuidance (summary, observations, red flags) and the plan the AI created,
 * which is already the user's active plan. From here: Hem (today's routine) or the chat for questions.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button, Card, Chip, Disclaimer, Icon, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, palette, radius, spacing } from '../../theme';
import type { Observation, Severity, SkinGuidance, TreatmentPlan } from '../../types/api';
import { RoutineStepStrip } from '../treatment-plan/components/RoutineStepCard';
import { planService } from '../treatment-plan/services/planService';

const AREA: Record<Observation['area'], string> = {
  forehead: 'Panna', nose: 'Näsa', left_cheek: 'Vänster kind', right_cheek: 'Höger kind', chin: 'Haka', jawline: 'Käklinje', overall: 'Helhet',
};
const SEVERITY: Record<Severity, { label: string; tone: 'success' | 'default' | 'attention' | 'danger' }> = {
  none: { label: 'Lugn', tone: 'success' },
  mild: { label: 'Mild', tone: 'default' },
  moderate: { label: 'Måttlig', tone: 'attention' },
  severe: { label: 'Kraftig', tone: 'danger' },
};
const SKIN_LABEL: Record<string, string> = { oily: 'Fet', dry: 'Torr', combination: 'Blandhud', normal: 'Normal', sensitive: 'Känslig', unknown: 'Okänd' };

export function ResultScreen({ navigation, route }: AppScreenProps<'Result'>) {
  const { assessmentId } = route.params;
  const [g, setG] = useState<SkinGuidance | null>(null);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      aiService.latestResult(assessmentId).then((r) => setG(r?.result ?? null));
      planService.active().then(setPlan).catch(() => setPlan(null));
    }, [assessmentId]),
  );

  if (!g) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </Screen>
    );
  }

  // The plan shown is the active one when it belongs to this assessment, otherwise the AI's proposal from the result.
  const p = plan && plan.assessment_id === assessmentId ? plan.plan : g.plan;

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <Button title="Fråga AI:n" variant="secondary" onPress={() => navigation.navigate('Tabs', { screen: 'Chat' })} style={styles.half} />
          <Button title="Till min plan  →" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} style={styles.half} />
        </View>
      }
    >
      <T variant="label" muted mb="xs">Din bedömning</T>
      <T variant="h1" mb="md">{g.primary_concern}</T>
      <View style={styles.chips}>
        <Chip label={`Helhet: ${SEVERITY[g.overall_severity].label}`} tone={SEVERITY[g.overall_severity].tone} />
        <Chip label={`Hudtyp: ${SKIN_LABEL[g.skin_type_estimate] ?? g.skin_type_estimate}`} />
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

      <Card tone="mint">
        <T variant="h3" mb="sm">Sammanfattning</T>
        <T>{g.guidance}</T>
      </Card>

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

      {/* ---- the plan (already active) ---- */}
      <View style={styles.planHead}>
        <View style={styles.planTag}>
          <View style={styles.planDot}><Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /></View>
          <T variant="label" color={colors.inkBrand}>Din plan är klar</T>
        </View>
        <T variant="h2" mb="xs">{p.title}</T>
        <T variant="small" muted>{p.summary}</T>
      </View>

      <Section title="Morgonrutin" icon="sun" bg={palette.sun} ink={palette.sunInk} count={p.morning.length}>
        <RoutineStepStrip steps={p.morning} tone="sun" />
      </Section>
      <Section title="Kvällsrutin" icon="moon" bg={palette.lavender} ink={palette.lavenderInk} count={p.evening.length}>
        <RoutineStepStrip steps={p.evening} tone="moon" />
      </Section>
      {p.weekly.length ? (
        <Section title="Veckoplan" icon="calendar" bg={colors.surfaceMint} ink={colors.inkBrand} count={p.weekly.length}>
          <RoutineStepStrip steps={p.weekly} tone="week" />
        </Section>
      ) : null}

      <Card>
        <T variant="h3" mb="sm">Bra att veta</T>
        {p.tips.map((t) => (
          <T key={t} variant="small" mb="xs">• {t}</T>
        ))}
        {p.avoid.length ? <T variant="small" muted style={styles.gap}>Undvik: {p.avoid.join(', ')}.</T> : null}
        <T variant="small" muted style={styles.gap}>{p.expectations}</T>
      </Card>

      <T variant="small" muted center mb="md">Vill du ändra något? Skriv till AI:n i chatten så justeras planen.</T>
      <Disclaimer text={g.disclaimer} />
    </Screen>
  );
}

function Section({ title, icon, bg, ink, count, children }: { title: string; icon: 'sun' | 'moon' | 'calendar'; bg: string; ink: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: bg }]}><Icon name={icon} size={22} color={ink} /></View>
        <View style={styles.sectionText}>
          <T variant="h3">{title}</T>
          <T variant="caption" muted>{count} steg</T>
        </View>
      </View>
      {children}
    </View>
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
  planHead: { marginTop: spacing.md, marginBottom: spacing.md },
  planTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  planDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  sectionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sectionText: { flex: 1 },
});
