/** Byt e-postadress – password + new address → code sent to the new address. Owner: Anas. */
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, InfoPanel, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AppScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, spacing } from '../../theme';

export function ChangeEmailScreen({ navigation }: AppScreenProps<'ChangeEmail'>) {
  const { session, refresh, isMock } = useAuth();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    setLoading(true);
    try {
      const r = await authService.changeEmail(password, email);
      setEmail(r.newEmail);
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.confirmEmail(code, email);
      await refresh();
      Alert.alert('Klart', `Du loggar nu in med ${email}.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T variant="h1" mb="xs">Byt e-postadress</T>
      {step === 1 ? (
        <>
          <T muted mb="xl">Nuvarande adress: <T variant="bodyMedium">{session?.email}</T>. Vi skickar en kod till den nya adressen för att bekräfta att den är din.</T>
          <Input label="Ditt lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          <Input label="Ny e-postadress" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error} />
          <Button title="Skicka kod  →" onPress={sendCode} loading={loading} disabled={!password || !email} style={styles.btn} />
        </>
      ) : (
        <>
          <T muted mb="lg">Vi har skickat en kod till <T variant="bodyMedium">{email}</T>. Skriv koden för att slutföra bytet.</T>
          {isMock ? <InfoPanel title="Demo-läge" text="Vilka sex siffror som helst fungerar." /> : <T variant="caption" muted>Kommer inget mejl inom en minut – kolla skräpposten eller tryck på ”Skicka ny kod”.</T>}
          <View style={styles.gap} />
          <Input label="Kod (6 siffror)" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" placeholder="123456" error={error} />
          <Button title="Bekräfta ny adress" onPress={confirm} loading={loading} disabled={code.length < 6} style={styles.btn} />
          <T variant="small" color={colors.inkBrand} center style={styles.again} onPress={sendCode} accessibilityRole="link">Skicka ny kod</T>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: spacing.md },
  gap: { height: spacing.md },
  again: { marginTop: spacing.lg },
});
