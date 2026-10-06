/**
 * Questionnaire screen – owner: Adam. Onboarding step 3/3 (design screens 6–8).
 * One question per step. Conditional follow-ups appear/disappear based on
 * earlier answers (utils/questionnaire.isVisible). Answers autosave on each step.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Screen, StepHeader, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import type { Answers, AnswerValue, Questionnaire } from '../../types/api';
import { isAnswered, visibleQuestions } from '../../utils/questionnaire';
import { QuestionRenderer } from './components/QuestionRenderer';
import { assessmentService } from './services/assessmentService';

export function AssessmentScreen({ navigation, route }: AppScreenProps<'Assessment'>) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(route.params?.assessmentId ?? null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const q = await assessmentService.getQuestionnaire();
        setQuestionnaire(q);
        if (assessmentId) {
          const a = await assessmentService.get(assessmentId);
          setAnswers(a.answers);
        } else {
          const a = await assessmentService.create();
          setAssessmentId(a.id);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [assessmentId]);

  const visible = useMemo(() => (questionnaire ? visibleQuestions(questionnaire, answers) : []), [questionnaire, answers]);
  const current = visible[Math.min(index, Math.max(visible.length - 1, 0))];
  const isLast = index >= visible.length - 1;
  const canContinue = current ? !current.required || isAnswered(current, answers) : false;

  const setAnswer = (value: AnswerValue) => {
    if (!current) return;
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (assessmentId) assessmentService.saveAnswers(assessmentId, { [current.id]: value }).catch(() => undefined);
    }, 400);
  };

  const next = async () => {
    if (!assessmentId) return;
    if (!isLast) return setIndex((i) => i + 1);
    setSubmitting(true);
    setError(null);
    try {
      await assessmentService.saveAnswers(assessmentId, answers);
      await assessmentService.submit(assessmentId);
      navigation.replace('ImageUpload', { assessmentId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!questionnaire || !current) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          {error ? <T color={colors.danger} center>{error}</T> : <ActivityIndicator color={colors.accent} />}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <Button title="Tillbaka" variant="ghost" disabled={index === 0} onPress={() => setIndex((i) => i - 1)} style={styles.back} />
          <Button title={isLast ? 'Fortsätt' : 'Fortsätt'} disabled={!canContinue} loading={submitting} onPress={next} style={styles.next} />
        </View>
      }
    >
      <StepHeader step={3} total={3} />
      <T variant="label" muted mb="sm">
        Fråga {index + 1} av {visible.length}
      </T>
      <QuestionRenderer question={current} value={answers[current.id]} onChange={setAnswer} />
      {error ? <T color={colors.danger}>{error}</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  back: { flex: 1 },
  next: { flex: 2 },
});
