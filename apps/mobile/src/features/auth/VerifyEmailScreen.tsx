import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { spacing } from '../../theme';

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
      <T variant="h1" mb="sm">Kolla din inkorg</T>
      <T muted mb="xl">
        Vi har skickat en verifieringslänk till <T variant="bodyMedium">{email}</T>. Öppna länken på den här enheten så loggas du in automatiskt.
      </T>
      <Card tone="mint">
        <T variant="h3" mb="sm">Hittar du inget mejl?</T>
        <T variant="small" muted>Kolla skräpposten, eller skicka länken igen.</T>
        <Button
          title={sent ? 'Skickat!' : 'Skicka igen'}
          variant="secondary"
          style={styles.resend}
          disabled={sent}
          onPress={async () => {
            await authService.resendVerification(email);
            setSent(true);
          }}
        />
      </Card>
      <View style={styles.actions}>
        <Button title="Jag har verifierat" onPress={isMock ? markVerified : refresh} />
        {isMock ? <T variant="caption" muted center style={styles.mock}>Demo-läge: knappen simulerar länken i mejlet.</T> : null}
        <Button title="Använd ett annat konto" variant="ghost" onPress={signOut} style={styles.other} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resend: { marginTop: spacing.lg },
  actions: { marginTop: spacing.xl },
  mock: { marginTop: spacing.md },
  other: { marginTop: spacing.md },
});
