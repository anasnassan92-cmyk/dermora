/**
 * Home tab – shared UI (Even). Entry point into the MVP journey and a summary
 * of the active plan. Uses the brand-kit "UI mood" cards.
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Icon, IconBadge, ListRow, Screen, T } from '../../components/ui';
import type { AppStackParamList, TabParamList } from '../../navigation/types';
import { assessmentService } from '../assessment/services/assessmentService';
import { profileService } from '../../services/profile/profileService';
import { colors, radius, spacing } from '../../theme';
import type { Assessment, Profile, TreatmentPlan } from '../../types/api';
import { planService } from './services/planService';

type Props = CompositeScreenProps<BottomTabScreenProps<TabParamList, 'Home'>, NativeStackScreenProps<AppStackParamList>>;

export function HomeScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<TreatmentPlan | null>(null);
  const [latest, setLatest] = useState<Assessment | null>(null);

  useFocusEffect(
    useCallback(() => {
      profileService.get().then(setProfile).catch(() => undefined);
      planService.active().then(setPlan).catch(() => setPlan(null));
      assessmentService.list().then((l) => setLatest(l[0] ?? null)).catch(() => undefined);
    }, []),
  );

  const firstName = profile?.display_name?.split(' ')[0];
  const draft = latest && latest.status === 'draft' ? latest : null;
  const start = () => {
    if (draft) return navigation.navigate('Assessment', { assessmentId: draft.id });
    if (!profile?.age_range) return navigation.navigate('ProfileSetup');
    navigation.navigate('AssessmentIntro');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h3" style={styles.brand}>Dermora</T>
        <Icon name="bell" size={22} color={colors.inkMuted} />
      </View>
      <T variant="small" muted>God morgon{firstName ? `, ${firstName}` : ''}</T>
      <T variant="h1" mb="lg">
        {plan ? (
          <>
            Din hudresa ser <T variant="h1" color={colors.accent}>bättre ut i dag.</T>
          </>
        ) : (
          'Låt oss förstå din hud'
        )}
      </T>

      {plan ? (
        <Card>
          <T variant="label" muted mb="xs">Aktiv plan</T>
          <T variant="h3" mb="xs">{plan.title}</T>
          <T variant="small" muted mb="md">{plan.summary}</T>
          <View style={styles.goals}>
            {plan.plan.goals.slice(0, 3).map((g) => (
              <View key={g} style={styles.goal}>
                <View style={styles.goalDot}><Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /></View>
                <T variant="caption">{g}</T>
              </View>
            ))}
          </View>
          <Button title="Visa planen" variant="secondary" onPress={() => navigation.navigate('Plan')} />
        </Card>
      ) : (
        <Pressable onPress={start} style={styles.heroCard} accessibilityRole="button">
          <IconBadge name="sparkles" size={44} tone="white" />
          <View style={styles.heroText}>
            <T variant="bodyMedium" color={colors.onBrand}>{draft ? 'Fortsätt bedömningen' : 'Personlig för din hud'}</T>
            <T variant="caption" color="rgba(255,255,255,0.85)">Svara på frågor, ta en bild och få din plan. Cirka fem minuter.</T>
          </View>
          <Icon name="chevron-right" size={22} color={colors.onBrand} />
        </Pressable>
      )}

      <View style={styles.rows}>
        <ListRow icon="face-scan" title="AI-hudanalys" subtitle={plan ? 'Gör en ny bedömning' : 'Starta din första bedömning'} onPress={start} />
        <ListRow icon="checklist" title="Min behandlingsplan" subtitle={plan ? 'Bekräftad plan' : 'Ingen plan ännu'} onPress={() => navigation.navigate('Plan')} />
        <ListRow icon="chat" title="Prata med Dermora AI" subtitle="Ställ frågor om din hud" onPress={() => navigation.navigate('Chat')} />
        <ListRow icon="chart-bars" title="Följ utveckling" subtitle="Kommer i nästa release" trailing="none" />
      </View>

      {!profile?.consent_images ? (
        <Card tone="mint">
          <T variant="bodyMedium" mb="xs">Godkänn bildbehandling</T>
          <T variant="caption" muted mb="md">För att analysera din hud behöver vi ditt godkännande att lagra bilder privat.</T>
          <Button title="Till profilen" variant="ghost" onPress={() => navigation.navigate('EditProfile')} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  symbol: { width: 32, height: 28 },
  brand: { flex: 1, marginBottom: 0 },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceBrand, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  heroText: { flex: 1, gap: 2 },
  goals: { marginBottom: spacing.md, gap: 4 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rows: { marginBottom: spacing.sm },
});
