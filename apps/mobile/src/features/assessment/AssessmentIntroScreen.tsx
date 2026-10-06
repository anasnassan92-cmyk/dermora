/** Design screen 05 – Frågeformulär, introduktion. Owner: Adam. */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Blob, FlowFooter, FlowHeader, Icon, InfoPanel, Screen, T, type IconName } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

const CARDS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'award', title: 'Personliga resultat', text: 'Dina svar hjälper oss att ge dig skräddarsydd vägledning.' },
  { icon: 'shield-check', title: 'Tryggt och säkert', text: 'Dina uppgifter behandlas konfidentiellt och används endast för att förbättra dina rekommendationer.' },
  { icon: 'clock', title: 'Tar bara några minuter', text: 'Frågeformuläret består av både fasta och anpassade frågor baserat på dina svar.' },
];

export function AssessmentIntroScreen({ navigation, route }: AppScreenProps<'AssessmentIntro'>) {
  const start = () => navigation.replace('Assessment', { assessmentId: route.params?.assessmentId });
  return (
    <Screen footer={<FlowFooter onNext={start} />}>
      <Blob />
      <FlowHeader step={3} onBack={() => navigation.goBack()} onSkip={start} />
      <T variant="display" style={styles.title}>Några frågor om{'\n'}din hud</T>
      <T variant="body" muted mb="xl">Detta hjälper vår AI att förstå din hud bättre och ge mer relevanta rekommendationer.</T>

      {CARDS.map((c) => (
        <View key={c.title} style={styles.card}>
          <View style={styles.badge}><Icon name={c.icon} size={30} color={colors.inkBrand} /></View>
          <View style={styles.cardText}>
            <T variant="h3" mb="xs">{c.title}</T>
            <T variant="small" muted>{c.text}</T>
          </View>
        </View>
      ))}

      <InfoPanel title="Tips!" text="Var så ärlig som möjligt i dina svar för att få den mest relevanta vägledningen." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, marginBottom: spacing.xs },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  badge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
});
