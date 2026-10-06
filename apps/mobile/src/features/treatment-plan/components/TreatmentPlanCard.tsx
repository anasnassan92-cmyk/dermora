import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, T } from '../../../components/ui';
import { spacing } from '../../../theme';
import type { TreatmentPlanProposal } from '../../../types/api';
import { TreatmentPlanItem } from './TreatmentPlanItem';

/** Full plan: morning / evening / weekly / avoid / expectations. */
export function TreatmentPlanCard({ plan }: { plan: TreatmentPlanProposal }) {
  return (
    <View>
      <Card tone="mint">
        <T variant="h2" mb="xs">{plan.title}</T>
        <T variant="small" muted>{plan.summary}</T>
      </Card>

      <Section title="Morgon" steps={plan.morning} />
      <Section title="Kväll" steps={plan.evening} />
      {plan.weekly.length ? <Section title="Veckovis" steps={plan.weekly} /> : null}

      {plan.avoid.length ? (
        <Card>
          <T variant="h3" mb="sm">Undvik</T>
          <View style={styles.chips}>
            {plan.avoid.map((a) => (
              <Chip key={a} label={a} tone="attention" />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <T variant="h3" mb="sm">Vad du kan förvänta dig</T>
        <T variant="small" mb="sm">{plan.expectations}</T>
        <T variant="small" muted>Uppföljning med ny bild om {plan.follow_up_days} dagar.</T>
      </Card>
    </View>
  );
}

function Section({ title, steps }: { title: string; steps: TreatmentPlanProposal['morning'] }) {
  if (!steps.length) return null;
  return (
    <Card>
      <T variant="h3" mb="sm">{title}</T>
      {steps.map((s, i) => (
        <TreatmentPlanItem key={`${title}-${i}`} step={s} index={i} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs } });
