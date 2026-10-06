/** Design screen 11 – "Vi analyserar din hud". Owner: Youssef. */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, IconBadge, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, spacing } from '../../theme';

const STEPS = ['Bearbetar dina svar', 'Analyserar dina bilder', 'Skapar insikter', 'Förbereder din personliga plan'];

export function AnalyzingScreen({ navigation, route }: AppScreenProps<'Analyzing'>) {
  const { assessmentId } = route.params;
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setDone((s) => Math.min(s + 1, STEPS.length - 1)), 1200);
    aiService
      .analyze(assessmentId)
      .then(() => navigation.replace('Result', { assessmentId }))
      .catch((e: Error) => setError(e.message))
      .finally(() => clearInterval(t));
    return () => clearInterval(t);
  }, [assessmentId, navigation]);

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.ring}>
          <IconBadge name="sparkles" size={88} />
        </View>
        <T variant="h1" center style={styles.title}>Vi analyserar din hud</T>
        <T variant="small" muted center>
          Vår AI går igenom dina svar och bilder. Detta tar vanligtvis några minuter.
        </T>
      </View>

      {error ? (
        <Card tone="danger">
          <T variant="bodyMedium" mb="xs">Något gick fel</T>
          <T variant="small" mb="md">{error}</T>
          <Button title="Försök igen" onPress={() => navigation.replace('Analyzing', { assessmentId })} />
          <Button title="Tillbaka" variant="ghost" onPress={() => navigation.goBack()} style={styles.gap} />
        </Card>
      ) : (
        <View style={styles.steps}>
          {STEPS.map((s, i) => {
            const state = i < done ? 'done' : i === done ? 'active' : 'todo';
            return (
              <View key={s} style={styles.step}>
                <View style={[styles.dot, state === 'done' && styles.dotDone, state === 'active' && styles.dotActive]}>
                  {state === 'done' ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}
                </View>
                <T variant="small" muted={state === 'todo'}>{s}</T>
              </View>
            );
          })}
        </View>
      )}

      <Card tone="mint">
        <View style={styles.factHead}>
          <Icon name="lightbulb" size={18} color={colors.inkBrand} />
          <T variant="bodyMedium">Visste du att?</T>
        </View>
        <T variant="small" muted>
          Vår AI kombinerar dina svar med dermatologisk kunskap för att ge skräddarsydda rekommendationer – men ersätter aldrig en läkare.
        </T>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: spacing.xl },
  ring: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: colors.surfaceMint, borderTopColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
  steps: { marginBottom: spacing.xl, gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { borderColor: colors.accent },
  factHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  gap: { marginTop: spacing.sm },
});
