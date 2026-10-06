/**
 * Questionnaire screen – owner: Adam. Design screens 06–08.
 * One question per step. Conditional follow-ups appear/disappear based on
 * earlier answers (utils/questionnaire.isVisible). Answers autosave on each step.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Blob, FlowFooter, FlowHeader, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import type { Answers, AnswerValue, Questionnaire } from '../../types/api';
import { isAnswered, visibleQuestions } from '../../utils/questionnaire';
import { QuestionRenderer } from './components/QuestionRenderer';
import { assessmentService } from './services/assessmentService';

export function AssessmentScreen({ navigation, route }: AppScreenProps<'Assessment'>) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(route.params?.assessmentId ?? null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(route.params?.startIndex ?? 0);
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
  const canContinue = current ? current.required === false || isAnswered(current, answers) : false;

  const setAnswer = (value: AnswerValue) => {
    if (!current) return;
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (assessmentId) assessmentService.saveAnswers(assessmentId, { [current.id]: value }).catch(() => undefined);
    }, 400);
  };

  const finish = async () => {
    if (!assessmentId) return;
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

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => (index === 0 ? navigation.goBack() : setIndex((i) => i - 1));

  if (!questionnaire || !current) {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>{error ? <T color={colors.danger} center>{error}</T> : <ActivityIndicator color={colors.accent} />}</View>
      </Screen>
    );
  }

  return (
    <Screen footer={<FlowFooter onBack={index > 0 ? back : undefined} onNext={next} disabled={!canContinue} loading={submitting} />}>
      <Blob />
      <FlowHeader step={3} onBack={back} onSkip={current.required === false ? next : undefined} />
      <QuestionRenderer question={current} value={answers[current.id]} onChange={setAnswer} />
      {error ? <T color={colors.danger}>{error}</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
