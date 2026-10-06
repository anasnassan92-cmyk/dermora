import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, IconBadge, T } from '../../../components/ui';
import { colors, radius, spacing } from '../../../theme';
import type { TreatmentPlanProposal } from '../../../types/api';
import { TreatmentPlanItem } from './TreatmentPlanItem';

/** Full plan in the design's layout: goals checklist + expandable routine rows. */
export function TreatmentPlanCard({ plan, compact = false }: { plan: TreatmentPlanProposal; compact?: boolean }) {
  return (
    <View>
      {plan.goals.length ? (
        <Card>
          <T variant="h3" mb="sm">Huvudmål</T>
          {plan.goals.map((g) => (
            <View key={g} style={styles.goal}>
              <View style={styles.goalDot}><Icon name="check" size={11} color={colors.onPrimary} strokeWidth={3} /></View>
              <T variant="small">{g}</T>
            </View>
          ))}
        </Card>
      ) : null}

      <T variant="h3" mb="sm">Rekommenderad rutin</T>
      <Section icon="sun" title="Morgonrutin" subtitle={`${plan.morning.length} steg`} open={!compact}>
        {plan.morning.map((s, i) => <TreatmentPlanItem key={`m${i}`} step={s} index={i} />)}
      </Section>
      <Section icon="moon" title="Kvällsrutin" subtitle={`${plan.evening.length} steg`} open={false}>
        {plan.evening.map((s, i) => <TreatmentPlanItem key={`e${i}`} step={s} index={i} />)}
      </Section>
      {plan.weekly.length ? (
        <Section icon="calendar" title="Veckovis" subtitle={`${plan.weekly.length} steg`} open={false}>
          {plan.weekly.map((s, i) => <TreatmentPlanItem key={`w${i}`} step={s} index={i} />)}
        </Section>
      ) : null}
      <Section icon="flask" title="Nyckelingredienser" subtitle={`${plan.key_ingredients.length} ingredienser`} open={false}>
        {plan.key_ingredients.map((k) => <Bullet key={k} text={k} />)}
      </Section>
      <Section icon="lightbulb" title="Ytterligare tips" subtitle="Livsstil och beteende" open={false}>
        {plan.tips.map((k) => <Bullet key={k} text={k} />)}
        {plan.avoid.map((k) => <Bullet key={k} text={`Undvik: ${k}`} />)}
      </Section>

      <Card tone="mint">
        <T variant="h3" mb="xs">Vad du kan förvänta dig</T>
        <T variant="small" mb="xs">{plan.expectations}</T>
        <T variant="caption" muted>Uppföljning med ny bild om {plan.follow_up_days} dagar.</T>
      </Card>
    </View>
  );
}

function Section({ icon, title, subtitle, open, children }: { icon: 'sun' | 'moon' | 'calendar' | 'flask' | 'lightbulb'; title: string; subtitle: string; open: boolean; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(open);
  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.sectionHead} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
        <IconBadge name={icon} size={40} />
        <View style={styles.sectionText}>
          <T variant="bodyMedium">{title}</T>
          <T variant="caption" muted>{subtitle}</T>
        </View>
        <Icon name={isOpen ? 'chevron-up' : 'chevron-right'} size={20} color={colors.inkMuted} />
      </Pressable>
      {isOpen ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <T variant="small" style={styles.bulletText}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  goalDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.sm, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  sectionText: { flex: 1 },
  sectionBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  bullet: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
  bulletText: { flex: 1 },
});
