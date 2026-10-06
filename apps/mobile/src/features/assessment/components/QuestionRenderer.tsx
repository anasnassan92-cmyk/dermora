import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip, T } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import type { AnswerValue, Question } from '../../../types/api';
import { QuestionOption } from './QuestionOption';

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/** Renders one question of any type. Pure UI – no API calls here. */
export function QuestionRenderer({ question, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <T variant="h2" mb="xs">
        {question.title}
        {!question.required ? <T variant="small" muted> (valfritt)</T> : null}
      </T>
      {question.help ? <T variant="small" muted mb="lg">{question.help}</T> : <View style={styles.gap} />}

      {question.type === 'single' &&
        question.options.map((o) => (
          <QuestionOption key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}

      {question.type === 'multi' &&
        question.options.map((o) => {
          const arr = Array.isArray(value) ? (value as string[]) : [];
          const on = arr.includes(o.value);
          return (
            <QuestionOption
              key={o.value}
              multi
              label={o.label}
              selected={on}
              onPress={() => onChange(on ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
            />
          );
        })}

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.xl },
  gap: { height: spacing.md },
  scale: { flexDirection: 'row', flexWrap: 'wrap' },
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
  },
});
