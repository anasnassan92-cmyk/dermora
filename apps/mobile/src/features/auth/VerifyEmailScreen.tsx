import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, IconBadge, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, spacing } from '../../theme';

/**
 * Shown after sign-up until the e-mail is verified. In real mode the user taps
 * the link in the e-mail (deep link dermora://verified) and we refresh the
 * session. In mock mode a button simulates the link.
 */
export function VerifyEmailScreen({ route }: AuthScreenProps<'VerifyEmail'>) {
  const { email } = route.params;
  const { refresh, markVerified, isMock, signOut } = useAuth();
  const [sent, setSent] = useState(false);

  return (
    <Screen>
      <View style={styles.logo}>
        <IconBadge name="mail" size={96} />
        <View style={styles.dot}><T variant="caption" color={colors.onPrimary}>1</T></View>
      </View>
      <T variant="h1" center mb="sm">Kontrollera din e-post</T>
      <T variant="small" muted center>
        Vi har skickat en verifieringslänk till
      </T>
      <T variant="bodyMedium" center mb="xs">{email}</T>
      <T variant="small" muted center mb="xl">
        Klicka på länken i e-posten för att verifiera ditt konto.
      </T>

      <Card tone="mint">
        <T variant="bodyMedium" center mb="xs">Har du inte fått något mejl?</T>
        <T variant="caption" muted center mb="md">Kontrollera din skräppost.</T>
        <Button
          title={sent ? 'Skickat!' : 'Skicka e-post igen'}
          variant="secondary"
          disabled={sent}
          onPress={async () => {
            await authService.resendVerification(email);
            setSent(true);
          }}
        />
      </Card>

      <T variant="small" color={colors.inkBrand} center onPress={signOut} accessibilityRole="link" style={styles.link}>
        Ändra e-postadress
      </T>

      <View style={styles.actions}>
        <Button title="Jag har verifierat" onPress={isMock ? markVerified : refresh} />
        {isMock ? (
          <View style={styles.mockRow}>
            <Icon name="info" size={14} color={colors.inkMuted} />
            <T variant="caption" muted>Demo-läge: knappen simulerar länken i mejlet.</T>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginVertical: spacing.xxl },
  dot: { position: 'absolute', top: 2, right: '34%', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  link: { marginTop: spacing.md },
  actions: { marginTop: spacing.xxl },
  mockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
});
