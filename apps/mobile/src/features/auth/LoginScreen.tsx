import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn, isMock } = useAuth();
  const [email, setEmail] = useState(isMock ? 'demo@dermora.se' : '');
  const [password, setPassword] = useState(isMock ? 'demo1234' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    if (password.length < 6) return setError('Lösenordet måste vara minst 6 tecken.');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T variant="h1" mb="sm">Välkommen tillbaka</T>
      <T muted mb="xl">Logga in för att fortsätta med din plan.</T>
      <Input label="E-post" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} />
      <Button title="Logga in" onPress={submit} loading={loading} />
      <View style={styles.row}>
        <T muted>Nytt här? </T>
        <T color="#04776B" onPress={() => navigation.navigate('Register')} accessibilityRole="link">
          Skapa konto
        </T>
      </View>
      {isMock ? <T variant="caption" muted center style={styles.mock}>Demo-läge: valfri e-post och lösenord fungerar.</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  mock: { marginTop: spacing.xl },
});
