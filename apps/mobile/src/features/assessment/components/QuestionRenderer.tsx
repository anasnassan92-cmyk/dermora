import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip, InfoPanel, PhotoOptionCard, T } from '../../../components/ui';
import { designImage } from '../../../constants/design';
import { colors, radius, spacing, typography } from '../../../theme';
import type { AnswerValue, Question } from '../../../types/api';
import { QuestionOption } from './QuestionOption';

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/** Renders one question (design screens 6–8). Pure UI – no API calls here. */
export function QuestionRenderer({ question, value, onChange }: Props) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const isMulti = question.type === 'multi';
  const selected = (v: string) => (isMulti ? arr.includes(v) : value === v);
  const pick = (v: string) => (isMulti ? toggle(v) : onChange(v));

  return (
    <View style={styles.wrap}>
      {question.context ? <T variant="label" muted mb="sm">{question.context}</T> : null}
      <T variant="display" style={styles.title}>{question.title}</T>
      <T variant="body" muted mb="xl">
        {question.help ?? (isMulti ? 'Du kan välja flera alternativ.' : 'Välj det alternativ som bäst beskriver din upplevelse.')}
        {question.required === false ? ' (valfritt)' : ''}
      </T>

      {question.layout === 'cards' && (question.type === 'single' || isMulti) &&
        question.options.map((o) => (
          <PhotoOptionCard key={o.value} label={o.label} description={o.description} image={designImage(o.image)} selected={selected(o.value)} multi={isMulti} onPress={() => pick(o.value)} />
        ))}

      {question.layout !== 'cards' && (question.type === 'single' || isMulti) &&
        question.options.map((o) => (
          <QuestionOption key={o.value} multi={isMulti} label={o.label} selected={selected(o.value)} onPress={() => pick(o.value)} />
        ))}

      {question.type === 'boolean' && (
        <>
          <QuestionOption label="Ja" selected={value === true} onPress={() => onChange(true)} />
          <QuestionOption label="Nej" selected={value === false} onPress={() => onChange(false)} />
        </>
      )}

      {question.type === 'scale' && (
        <View style={styles.scale}>
          {Array.from({ length: (question.max ?? 10) - (question.min ?? 0) + 1 }, (_, i) => (question.min ?? 0) + i).map((n) => (
            <Chip key={n} label={String(n)} selected={value === n} onPress={() => onChange(n)} />
          ))}
        </View>
      )}

      {question.type === 'text' && (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          multiline
          numberOfLines={4}
          maxLength={1000}
          placeholder="Skriv här …"
          placeholderTextColor={colors.inkMuted}
          style={styles.textarea}
          accessibilityLabel={question.title}
        />
      )}

      {question.note ? <InfoPanel text={question.note} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.md },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  scale: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  textarea: {
    ...typography.body,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceRaised,
    color: colors.ink,
    marginBottom: spacing.lg,
  },
});
