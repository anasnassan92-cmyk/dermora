/** Mina uppgifter – the questionnaire answers (read-only) and the uploaded images. Owner: Anas. */
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Card, Chip, InfoPanel, Screen, T } from '../../components/ui';
import { useContentWidth } from '../../hooks/useContentWidth';
import type { AppScreenProps } from '../../navigation/types';
import { imageStorageService } from '../../services/storage/imageStorageService';
import { colors, radius, spacing } from '../../theme';
import type { AnswerValue, Assessment, Question, SkinImage } from '../../types/api';
import { assessmentService } from '../assessment/services/assessmentService';

const AREA_LABEL: Record<SkinImage['area'], string> = {
  face: 'Ansikte', left: 'Vänster', right: 'Höger', closeup: 'Närbild', forehead: 'Panna', left_cheek: 'Vänster kind', right_cheek: 'Höger kind', chin: 'Haka', other: 'Övrigt',
};

/** Turns a stored answer into the option labels the user picked. */
function answerText(q: Question, v: AnswerValue): string {
  const label = (x: string | number | boolean) => q.options.find((o) => o.value === String(x))?.label ?? String(x);
  if (Array.isArray(v)) return v.length ? v.map(label).join(', ') : '–';
  if (typeof v === 'boolean') return v ? 'Ja' : 'Nej';
  return label(v);
}

function dateLabel(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('sv-SE') : '';
}

export function MyInfoScreen(_props: AppScreenProps<'MyInfo'>) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null | undefined>(undefined);
  const [images, setImages] = useState<SkinImage[]>([]);
  const w = useContentWidth();
  const imgW = Math.floor((w - spacing.md * 2 - spacing.sm) / 2);
  const imgH = Math.round(imgW * 1.1);

  useEffect(() => {
    assessmentService.getQuestionnaire().then((q) => setQuestions(q.questions)).catch(() => setQuestions([]));
    assessmentService
      .list()
      .then((list) => setAssessment(list.find((a) => a.status === 'analyzed' || a.status === 'submitted') ?? list[0] ?? null))
      .catch(() => setAssessment(null));
    imageStorageService.list().then(setImages).catch(() => setImages([]));
  }, []);

  const answered = assessment ? questions.filter((q) => assessment.answers[q.id] !== undefined && assessment.answers[q.id] !== '') : [];

  return (
    <Screen>
      <T variant="h1" mb="xs">Mina uppgifter</T>
      <T muted mb="lg">Det du har fyllt i och laddat upp. Svaren är låsta – gör en ny skanning om något har ändrats.</T>

      <Card>
        <View style={styles.head}>
          <T variant="label" muted>Formuläret</T>
          {assessment?.submitted_at || assessment?.created_at ? <Chip label={dateLabel(assessment.submitted_at ?? assessment.created_at)} /> : null}
        </View>
        {assessment === undefined ? (
          <T muted>Hämtar…</T>
        ) : !assessment || answered.length === 0 ? (
          <T muted>Inga svar ännu. Starta en hudskanning från Hem för att fylla i formuläret.</T>
        ) : (
          answered.map((q) => (
            <View key={q.id} style={styles.row}>
              <T variant="small" muted>{q.title}</T>
              <T variant="bodyMedium">{answerText(q, assessment.answers[q.id])}</T>
            </View>
          ))
        )}
      </Card>

      <Card>
        <T variant="label" muted mb="sm">Mina bilder ({images.length})</T>
        {images.length === 0 ? (
          <T muted>Inga bilder uppladdade ännu.</T>
        ) : (
          <View style={styles.grid}>
            {images.map((img) => (
              <View key={img.id} style={{ width: imgW }}>
                <Image source={{ uri: img.url ?? undefined }} style={[styles.img, { width: imgW, height: imgH }]} resizeMode="cover" accessibilityLabel={AREA_LABEL[img.area]} />
                <T variant="caption" muted>{AREA_LABEL[img.area]} · {dateLabel(img.created_at)}</T>
              </View>
            ))}
          </View>
        )}
      </Card>

      <InfoPanel title="Låst formulär" text="Svaren kan inte ändras i efterhand – de hör ihop med analysen som gjordes. Vill du uppdatera något gör du en ny skanning." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  row: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderControl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  img: { borderRadius: radius.md, backgroundColor: colors.surfaceSunken, marginBottom: 4 },
});
