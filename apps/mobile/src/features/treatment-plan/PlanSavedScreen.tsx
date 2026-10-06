/**
 * Design screen 15 – "Din plan är sparad!". Owner: Even.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Button, Icon, ListRow, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing } from '../../theme';

export function PlanSavedScreen({ navigation }: AppScreenProps<'PlanSaved'>) {
  const goTabs = (tab: 'Plan' | 'Chat' | 'Profile') => {
    navigation.popToTop();
    navigation.navigate('Tabs');
    setTimeout(() => navigation.navigate('Tabs', { screen: tab } as never), 0);
  };
  return (
    <Screen>
      <View style={styles.logo}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h2" style={styles.wordmark}>Dermora</T>
        <T variant="caption" muted>Din hud, förstådd</T>
      </View>

      <View style={styles.hero}>
        <View style={styles.check}>
          <Icon name="check" size={40} color={colors.onPrimary} strokeWidth={2.5} />
        </View>
        <T variant="h1" center style={styles.title}>Din plan är sparad!</T>
        <T variant="small" muted center>
          Din personliga hudplan finns nu tillgänglig. Du kan när som helst se den och fortsätta din konversation med Dermora AI.
        </T>
      </View>

      <Button title="Visa min plan" onPress={() => goTabs('Plan')} />
      <View style={styles.rows}>
        <ListRow icon="chat" title="Chatta med AI" subtitle="Ställ fler frågor" onPress={() => goTabs('Chat')} />
        <ListRow icon="user" title="Uppdatera mina uppgifter" subtitle="Justera dina svar och bilder" onPress={() => goTabs('Profile')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginTop: spacing.lg },
  symbol: { width: 44, height: 38 },
  wordmark: { marginTop: spacing.xs, marginBottom: 0 },
  hero: { alignItems: 'center', marginVertical: spacing.xxl },
  check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: colors.surfaceMint },
  title: { marginTop: spacing.xl, marginBottom: spacing.sm },
  rows: { marginTop: spacing.lg },
});
