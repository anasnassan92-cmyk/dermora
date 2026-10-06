/**
 * Design screen 15 – Hem with "PLAN SPARAD" banner, goals, routines, weekly plan, product types, tip.
 * Owner: Even (shared UI).
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Icon, InfoPanel, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { assessmentService } from '../assessment/services/assessmentService';
import { profileService } from '../../services/profile/profileService';
import { colors, palette, radius, shadow, spacing } from '../../theme';
import type { Assessment, Profile, TreatmentPlan } from '../../types/api';
import { RoutineStepStrip } from './components/RoutineStepCard';
import { planService } from './services/planService';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>, NativeStackScreenProps<AppStackParamList>>;

export function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [latest, setLatest] = useState<Assessment | null>(null);
  const [tipOpen, setTipOpen] = useState(true);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => undefined);
      planService.active().then(setPlan).catch(() => setPlan(null));
      assessmentService.list().then((l) => setLatest(l[0] ?? null)).catch(() => undefined);
    }, []),
  );

  const draft = latest && latest.status === 'draft' ? latest : null;
  const start = () => {
    if (draft) return navigation.navigate('Assessment', { assessmentId: draft.id });
    if (!profile?.age_range) return navigation.navigate('ProfileSetup');
    navigation.navigate('AssessmentIntro');
  };
  const chat = () => (plan?.assessment_id ? navigation.navigate('AIChat', { assessmentId: plan.assessment_id }) : start());

  return (
    <Screen>
      <View style={styles.top}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <View style={styles.brand}>
          <T variant="h2" style={styles.brandName}>Dermora</T>
          <T variant="caption" muted>Din hud, förstådd</T>
        </View>
        <Pressable style={styles.bell} accessibilityRole="button" accessibilityLabel="Notiser">
          <Icon name="bell" size={22} color={colors.ink} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {plan ? (
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <View style={styles.savedTag}>
              <View style={styles.savedDot}><Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /></View>
              <T variant="label" color={colors.inkBrand}>Plan sparad</T>
            </View>
            <T variant="display" style={styles.bannerTitle}>Din personliga{'\n'}hudplan är klar!</T>
            <T variant="small" muted>Vi har sparat din plan och anpassat den efter din hud och dina mål.</T>
          </View>
          <Image source={DESIGN['robot-thumbs']} style={styles.bannerRobot} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <T variant="display" style={styles.bannerTitle}>Låt oss förstå{'\n'}din hud</T>
            <T variant="small" muted mb="md">Svara på några frågor, ta bilder och få din personliga plan. Tar cirka fem minuter.</T>
            <Button title={draft ? 'Fortsätt bedömningen  →' : 'Starta hudanalys  →'} onPress={start} />
          </View>
          <Image source={DESIGN['robot-wave']} style={styles.bannerRobot} resizeMode="contain" />
        </View>
      )}

      {plan ? (
        <>
          <View style={styles.goals}>
            <View style={styles.goalsIcon}><Icon name="award" size={24} color={colors.inkBrand} /></View>
            <View style={styles.goalsText}>
              <T variant="bodyMedium">Dina huvudsakliga mål</T>
              <T variant="small" muted>{plan.plan.goals.join(', ').replace(/^./, (c) => c.toUpperCase())}.</T>
            </View>
            <Pressable onPress={() => navigation.navigate('Plan')} style={styles.linkBtn} accessibilityRole="button">
              <T variant="caption" color={colors.inkBrand}>Visa mål</T>
              <Icon name="chevron-right" size={14} color={colors.inkBrand} />
            </Pressable>
          </View>

          <Routine title="Morgonrutin" steps={plan.plan.morning} tone="sun" bg={palette.sun} ink={palette.sunInk} onStart={() => navigation.navigate('Plan')} />
          <Routine title="Kvällsrutin" steps={plan.plan.evening} tone="moon" bg={palette.lavender} ink={palette.lavenderInk} onStart={() => navigation.navigate('Plan')} />

          <Pressable onPress={() => navigation.navigate('Plan')} style={styles.weekly} accessibilityRole="button">
            <View style={[styles.routineIcon, { backgroundColor: colors.surfaceMint }]}><Icon name="calendar" size={22} color={colors.inkBrand} /></View>
            <View style={styles.weeklyText}>
              <T variant="bodyMedium">Veckoplan</T>
              <T variant="caption" muted>{plan.plan.weekly.length} extra behandlingar per vecka</T>
            </View>
            <View style={styles.linkBtn}>
              <T variant="caption" color={colors.inkBrand}>Visa plan</T>
              <Icon name="chevron-right" size={14} color={colors.inkBrand} />
            </View>
          </Pressable>

          <View style={styles.products}>
            <View style={styles.productsHead}>
              <View>
                <T variant="h3">Rekommenderade produkttyper</T>
                <T variant="caption" muted>Utvalda för din hudtyp och dina hudproblem.</T>
              </View>
            </View>
            {plan.plan.key_ingredients.slice(0, 3).map((k) => (
              <View key={k} style={styles.ingredient}>
                <View style={styles.ingredientDot}><Icon name="flask" size={12} color={colors.inkBrand} /></View>
                <T variant="small" style={styles.ingredientText}>{k}</T>
              </View>
            ))}
          </View>

          <Pressable onPress={chat} style={styles.chatRow} accessibilityRole="button">
            <Image source={DESIGN['robot-avatar']} style={styles.chatAvatar} />
            <View style={styles.weeklyText}>
              <T variant="bodyMedium">Chatta med din hudexpert</T>
              <T variant="caption" muted>Ställ frågor om din plan</T>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkMuted} />
          </Pressable>

          {tipOpen ? (
            <View>
              <InfoPanel text="Resultat syns oftast efter 4–8 veckor vid konsekvent användning. Följ din plan och logga din rutin för att se dina framsteg." />
              <Pressable onPress={() => setTipOpen(false)} style={styles.closeTip} accessibilityRole="button" accessibilityLabel="Stäng tips">
                <Icon name="close" size={16} color={colors.inkMuted} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Pressable onPress={start} style={styles.weekly} accessibilityRole="button">
            <View style={[styles.routineIcon, { backgroundColor: colors.surfaceMint }]}><Icon name="face-scan" size={22} color={colors.inkBrand} /></View>
            <View style={styles.weeklyText}>
              <T variant="bodyMedium">AI-hudanalys</T>
              <T variant="caption" muted>Frågor, bilder och personlig vägledning</T>
            </View>
            <Icon name="chevron-right" size={18} color={colors.inkMuted} />
          </Pressable>
          {!profile?.consent_images ? (
            <InfoPanel icon="shield-check" title="Dina bilder är privata" text="Vi lagrar bilder krypterat, tar bort GPS-data och använder aldrig ansiktsigenkänning. Du godkänner bildbehandling i din profil." />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Routine({ title, steps, tone, bg, ink, onStart }: { title: string; steps: TreatmentPlan['plan']['morning']; tone: 'sun' | 'moon'; bg: string; ink: string; onStart: () => void }) {
  return (
    <View style={styles.routine}>
      <View style={styles.routineHead}>
        <View style={[styles.routineIcon, { backgroundColor: bg }]}><Icon name={tone} size={24} color={ink} /></View>
        <View style={styles.weeklyText}>
          <T variant="h3">{title}</T>
          <T variant="caption" muted>{steps.length} steg · ~ {Math.max(1, Math.round(steps.length * 0.75))} minuter</T>
        </View>
        <Pressable onPress={onStart} style={styles.startBtn} accessibilityRole="button">
          <T variant="caption" color={colors.inkBrand}>Starta rutin</T>
          <Icon name="chevron-right" size={14} color={colors.inkBrand} />
        </Pressable>
      </View>
      <RoutineStepStrip steps={steps} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  symbol: { width: 52, height: 44 },
  brand: { flex: 1 },
  brandName: { marginBottom: 0 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  bellDot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  banner: { flexDirection: 'row', backgroundColor: colors.surfaceMint, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' },
  bannerText: { flex: 1.4 },
  bannerRobot: { width: 120, height: 150, alignSelf: 'flex-end', marginRight: -spacing.md },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  savedDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 26, lineHeight: 31, marginBottom: spacing.xs },
  goals: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceMint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  goalsIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  goalsText: { flex: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1.5, borderColor: colors.accent, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  routine: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  routineHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  routineIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  weekly: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  weeklyText: { flex: 1 },
  products: { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  productsHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  ingredientDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceMint, alignItems: 'center', justifyContent: 'center' },
  ingredientText: { flex: 1 },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.line },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceMint },
  closeTip: { position: 'absolute', top: 12, right: 12, padding: 4 },
});
