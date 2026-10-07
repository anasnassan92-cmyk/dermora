/** Design screen 01 – Välkomstskärm. Owner: Anas. */
import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useContentWidth } from '../../hooks/useContentWidth';

import { Button, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AuthScreenProps } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  const { height } = useWindowDimensions();
  const w = useContentWidth();
  // The portrait is 800×698. Explicit pixel size (Android ignores % + aspectRatio for images), capped at ~36 % of the screen.
  const h = Math.min(Math.round(w / (800 / 698)), Math.max(220, Math.round(height * 0.36)));
  return (
    <Screen>
      <View style={[styles.portraitWrap, { width: w, height: h }]}>
        <Image source={DESIGN['welcome-portrait']} style={{ width: w, height: h }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={styles.logo}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h1" style={styles.wordmark}>Dermora</T>
        <T variant="caption" muted style={styles.tagline}>Din hud, förstådd</T>
      </View>

      <T variant="display" center style={styles.headline}>Din personliga{'\n'}AI-dermatolog</T>
      <T variant="body" muted center mb="xl" style={styles.lead}>
        Förstå dina hudproblem direkt. Besvara några frågor, ta bilder och få personliga rekommendationer som passar just dig.
      </T>

      <Button title="Kom igång  →" onPress={() => navigation.navigate('Register')} />
      <T variant="bodyMedium" color={colors.inkBrand} center style={styles.login} onPress={() => navigation.navigate('Login')} accessibilityRole="link">
        Logga in på befintligt konto
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  portraitWrap: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceMint, marginBottom: spacing.lg, alignSelf: 'center' },
  logo: { alignItems: 'center', marginBottom: spacing.lg },
  symbol: { width: 56, height: 48 },
  wordmark: { marginTop: spacing.xs, marginBottom: 0 },
  tagline: { letterSpacing: 1.2 },
  headline: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  lead: { paddingHorizontal: spacing.sm },
  login: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
