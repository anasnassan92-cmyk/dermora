import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Screen, T } from '../../components/ui';
import { TAGLINE } from '../../constants';
import type { AuthScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';

export function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="display" center mb="sm">
          Din hud,{'\n'}
          <T variant="display" color={colors.accent}>
            förstådd.
          </T>
        </T>
        <T variant="body" muted center>
          Svara på några frågor, ta en bild och få personlig vägledning och en plan som är gjord för just dig.
        </T>
      </View>
      <View style={styles.actions}>
        <Button title="Kom igång" onPress={() => navigation.navigate('Register')} />
        <Button title="Jag har redan ett konto" variant="ghost" onPress={() => navigation.navigate('Login')} style={styles.secondary} />
        <T variant="caption" muted center style={styles.note}>
          {TAGLINE} · Vägledning, inte medicinsk diagnos.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  symbol: { width: 96, height: 84, marginBottom: spacing.xxl },
  actions: { paddingBottom: spacing.lg },
  secondary: { marginTop: spacing.md },
  note: { marginTop: spacing.lg },
});
