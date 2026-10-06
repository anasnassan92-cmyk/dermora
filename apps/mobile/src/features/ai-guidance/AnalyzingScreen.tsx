import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { aiService } from '../../services/ai/aiService';
import { colors, spacing } from '../../theme';

const STEPS = ['Läser dina svar …', 'Tittar på dina bilder …', 'Väger samman helheten …', 'Skriver din vägledning …'];

/** Runs the analysis once and forwards to the result. */
export function AnalyzingScreen({ navigation, route }: AppScreenProps<'Analyzing'>) {
  const { assessmentId } = route.params;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
    aiService
      .analyze(assessmentId)
      .then(() => navigation.replace('Result', { assessmentId }))
      .catch((e: Error) => setError(e.message))
      .finally(() => clearInterval(t));
    return () => clearInterval(t);
  }, [assessmentId, navigation]);

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        {error ? (
          <>
            <T variant="h2" center mb="sm">Något gick fel</T>
            <T muted center mb="xl">{error}</T>
            <Button title="Försök igen" onPress={() => navigation.replace('Analyzing', { assessmentId })} />
            <Button title="Tillbaka" variant="ghost" onPress={() => navigation.goBack()} style={styles.gap} />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <T variant="h2" center style={styles.title}>{STEPS[step]}</T>
            <T variant="small" muted center>Det tar vanligtvis under en minut.</T>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
  gap: { marginTop: spacing.md },
});
