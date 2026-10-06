import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Chip, OptionCard, T, type IconName } from '../../../components/ui';
import { colors, radius, spacing, typography } from '../../../theme';
import type { AnswerValue, Question } from '../../../types/api';
import { QuestionOption } from './QuestionOption';

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/** Renders one question of any type. Pure UI – no API calls here.
 *  layout: 'cards' = rows with description (skin type), 'grid' = icon tiles (concerns), default = radio/checkbox list. */
export function QuestionRenderer({ question, value, onChange }: Props) {
  const arr = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <View style={styles.wrap}>
      <T variant="h1" mb="xs" style={styles.title}>
        {question.title}
      </T>
      <T variant="small" muted mb="lg">
        {question.help ?? (question.type === 'multi' ? 'Välj ett eller flera alternativ.' : 'Välj det alternativ som bäst beskriver din upplevelse.')}
        {!question.required ? ' (valfritt)' : ''}
      </T>

      {question.layout === 'cards' &&
        question.options.map((o) => (
          <OptionCard
            key={o.value}
            label={o.label}
            description={o.description}
            icon={(o.icon as IconName) ?? null}
            selected={question.type === 'multi' ? arr.includes(o.value) : value === o.value}
            multi={question.type === 'multi'}
            onPress={() => (question.type === 'multi' ? toggle(o.value) : onChange(o.value))}
          />
        ))}

      {question.layout === 'grid' && (
        <View style={styles.grid}>
          {question.options.map((o) => (
            <OptionCard
              key={o.value}
              variant="tile"
              label={o.label}
              icon={(o.icon as IconName) ?? 'plus'}
              selected={question.type === 'multi' ? arr.includes(o.value) : value === o.value}
              multi={question.type === 'multi'}
              onPress={() => (question.type === 'multi' ? toggle(o.value) : onChange(o.value))}
            />
          ))}
        </View>
      )}

      {!question.layout && question.type === 'single' &&
        question.options.map((o) => (
          <QuestionOption key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}

      {!question.layout && question.type === 'multi' &&
        question.options.map((o) => (
          <QuestionOption key={o.value} multi label={o.label} selected={arr.includes(o.value)} onPress={() => toggle(o.value)} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.xl },
  title: { fontSize: 22, lineHeight: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
