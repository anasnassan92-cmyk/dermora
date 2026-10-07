/** Glömt lösenord – e-post → 6-siffrig kod + nytt lösenord. Owner: Anas. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Blob, Button, FlowHeader, InfoPanel, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, spacing } from '../../theme';

export function ForgotPasswordScreen({ navigation, route }: AuthScreenProps<'ForgotPassword'>) {
  const { refresh, isMock } = useAuth();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [step, setStep] = useState<1 | 2>(1);
  const [demo, setDemo] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    setLoading(true);
    try {
      const r = await authService.forgotPassword(email);
      setDemo(r.demo);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword(email, code.replace(/\D/g, ''), password);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Blob />
      <FlowHeader step={1} onBack={() => (step === 2 ? setStep(1) : navigation.goBack())} />
      <T variant="display" style={styles.title}>{step === 1 ? 'Glömt lösenord?' : 'Välj nytt lösenord'}</T>
      {step === 1 ? (
        <>
          <T variant="body" muted mb="xl">Skriv din e-postadress så skickar vi en sexsiffrig kod som du använder för att välja ett nytt lösenord.</T>
          <Input label="E-postadress" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error} />
          <Button title="Skicka kod  →" onPress={sendCode} loading={loading} />
        </>
      ) : (
        <>
          <T variant="body" muted mb="lg">Vi har skickat en kod till <T variant="bodyMedium">{email}</T>. Skriv koden och ditt nya lösenord.</T>
          {demo || isMock ? (
            <InfoPanel title="Demo-läge" text={isMock ? 'Vilka sex siffror som helst fungerar.' : 'E-post är inte aktiverad ännu. Koden finns i serverns logg (hPanel → Runtime logs) – be administratören om den.'} />
          ) : null}
          <View style={styles.gap} />
          <Input label="Kod (6 siffror)" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder="123456" />
          <Input label="Nytt lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="Minst 8 tecken, med en siffra och en bokstav." error={error} />
          <Button title="Spara och logga in  →" onPress={reset} loading={loading} disabled={code.length < 6 || password.length < 8} />
          <T variant="small" color={colors.inkBrand} center style={styles.again} onPress={sendCode} accessibilityRole="link">Skicka ny kod</T>
        </>
      )}
      <T variant="small" color={colors.inkBrand} center style={styles.back} onPress={() => navigation.navigate('Login')} accessibilityRole="link">Tillbaka till inloggning</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  gap: { height: spacing.md },
  again: { marginTop: spacing.lg },
  back: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
