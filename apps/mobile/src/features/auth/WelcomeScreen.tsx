import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Icon, IconBadge, Screen, T } from '../../components/ui';
import type { AuthScreenProps } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

const POINTS: { icon: 'sparkles' | 'checklist' | 'flask'; text: string }[] = [
  { icon: 'sparkles', text: 'Förstå din hud bättre' },
  { icon: 'checklist', text: 'Få en personlig plan' },
  { icon: 'flask', text: 'Vetenskapsbaserad vägledning' },
];

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  return (
    <Screen scroll={false}>
      <View style={styles.topRow}>
        <View style={styles.lang} accessibilityRole="button" accessibilityLabel="Språk: Svenska">
          <Icon name="globe" size={16} color={colors.inkBrand} />
          <T variant="caption" color={colors.inkBrand}>Svenska</T>
          <Icon name="chevron-down" size={14} color={colors.inkBrand} />
        </View>
      </View>

      <View style={styles.hero}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h1" style={styles.wordmark}>Dermora</T>
        <T variant="caption" muted style={styles.tagline}>DIN HUD, FÖRSTÅDD.</T>

        <T variant="display" mb="sm" style={styles.headline}>
          Personlig hudvägledning, skapad för <T variant="display" color={colors.accent}>dig</T>
        </T>
        <T variant="small" muted mb="lg">
          Svara på några frågor, ladda upp bilder och få personlig vägledning från AI – anpassad efter din unika hud.
        </T>

        {POINTS.map((p) => (
          <View key={p.text} style={styles.point}>
            <IconBadge name={p.icon} size={36} />
            <T variant="small">{p.text}</T>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Kom igång" onPress={() => navigation.navigate('Register')} />
        <Button title="Logga in" variant="ghost" onPress={() => navigation.navigate('Login')} style={styles.secondary} />
        <T variant="caption" muted center style={styles.note}>
          Genom att fortsätta godkänner du våra Användarvillkor och Integritetspolicy.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceMint, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  hero: { flex: 1, justifyContent: 'center' },
  symbol: { width: 64, height: 56 },
  wordmark: { marginTop: spacing.sm, marginBottom: 0 },
  tagline: { letterSpacing: 1.6, marginBottom: spacing.xl },
  headline: { fontSize: 28, lineHeight: 34 },
  point: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  actions: { paddingBottom: spacing.sm },
  secondary: { marginTop: spacing.md },
  note: { marginTop: spacing.md },
});
