/**
 * Onboarding step 2/3 – "Låt oss lära känna din hud bättre" (design screen 5). Owner: Adam.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, IconBadge, Screen, StepHeader, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';

const FACTS: { icon: 'clock' | 'edit' | 'calendar-check'; text: string }[] = [
  { icon: 'clock', text: 'Tar cirka 5–7 minuter' },
  { icon: 'edit', text: 'Vissa frågor anpassas efter dina tidigare svar' },
  { icon: 'calendar-check', text: 'Du kan alltid uppdatera dina svar senare' },
];

export function AssessmentIntroScreen({ navigation, route }: AppScreenProps<'AssessmentIntro'>) {
  return (
    <Screen footer={<Button title="Starta frågeformulär" onPress={() => navigation.replace('Assessment', { assessmentId: route.params?.assessmentId })} />}>
      <StepHeader step={2} total={3} />
      <View style={styles.hero}>
        <IconBadge name="checklist" size={120} />
        <T variant="h1" center style={styles.title}>Låt oss lära känna din hud bättre</T>
        <T variant="small" muted center>
          Du får svara på några frågor om din hud, din livsstil och eventuella hudproblem. Det tar cirka 5–7 minuter och hjälper oss att ge mer personlig vägledning.
        </T>
      </View>
      <Card tone="mint">
        {FACTS.map((f) => (
          <View key={f.text} style={styles.fact}>
            <Icon name={f.icon} size={20} color={colors.inkBrand} />
            <T variant="small" style={styles.factText}>{f.text}</T>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  factText: { flex: 1 },
});
