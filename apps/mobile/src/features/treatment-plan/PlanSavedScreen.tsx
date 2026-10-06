/** Design screen 15 (overview version) – "Din hudvårdsplan är sparad!". Owner: Even. */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Blob, Button, Icon, ListRow, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';

export function PlanSavedScreen({ navigation }: AppScreenProps<'PlanSaved'>) {
  const goTab = (tab: 'Home' | 'Scan' | 'Progress' | 'Profile') => {
    navigation.popToTop();
    navigation.navigate('Tabs', { screen: tab } as never);
  };
  return (
    <Screen>
      <Blob />
      <View style={styles.logo}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h2" style={styles.wordmark}>Dermora</T>
        <T variant="caption" muted>Din hud, förstådd</T>
      </View>

      <View style={styles.hero}>
        <Image source={DESIGN['robot-thumbs']} style={styles.robot} resizeMode="contain" />
        <View style={styles.check}><Icon name="check" size={36} color={colors.onPrimary} strokeWidth={2.5} /></View>
        <T variant="display" center style={styles.title}>Din hudvårdsplan{'\n'}är sparad!</T>
        <T variant="body" muted center>
          Du hittar din plan i appen och kan när som helst gå tillbaka, göra ändringar eller chatta med din hudexpert.
        </T>
      </View>

      <Button title="Gå till min plan  →" onPress={() => goTab('Home')} />
      <Button title="Till startsidan" variant="ghost" onPress={() => goTab('Home')} style={styles.gap} />
      <View style={styles.rows}>
        <ListRow icon="chat" title="Chatta med din hudexpert" subtitle="Ställ fler frågor om din plan" onPress={() => goTab('Home')} />
        <ListRow icon="user" title="Uppdatera mina uppgifter" subtitle="Justera dina svar och bilder" onPress={() => goTab('Profile')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginTop: spacing.lg },
  symbol: { width: 44, height: 38 },
  wordmark: { marginTop: spacing.xs, marginBottom: 0 },
  hero: { alignItems: 'center', marginVertical: spacing.xl },
  robot: { width: 180, height: 140, marginBottom: -spacing.lg },
  check: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: colors.surfaceMint, marginBottom: spacing.md },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  gap: { marginTop: spacing.md },
  rows: { marginTop: spacing.xl },
});
