/** Logga in – same visual language as Skapa konto. Owner: Anas. */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Blob, Button, FlowHeader, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, spacing } from '../../theme';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn, isMock, refresh } = useAuth();
  const [email, setEmail] = useState(isMock ? 'demo@dermora.se' : '');
  const [password, setPassword] = useState(isMock ? 'demo1234' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    if (password.length < 6) return setError('Ange ditt lösenord.');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      await authService.signInWithGoogle();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      <Blob />
      <FlowHeader step={1} onBack={() => navigation.goBack()} />
      <T variant="display" style={styles.title}>Välkommen tillbaka</T>
      <T variant="body" muted mb="xl">Logga in för att fortsätta med din hudplan.</T>
      <Button title="Fortsätt med Google" variant="secondary" onPress={google} />
      <View style={styles.or}>
        <View style={styles.orLine} />
        <T variant="small" muted>eller</T>
        <View style={styles.orLine} />
      </View>
      <Input label="E-postadress" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" error={error} />
      <Button title="Logga in  →" onPress={submit} loading={loading} />
      <View style={styles.row}>
        <T variant="small" muted>Ny här? </T>
        <T variant="small" color={colors.inkBrand} onPress={() => navigation.navigate('Register')} accessibilityRole="link">Skapa konto</T>
      </View>
      {isMock ? <T variant="caption" muted center style={styles.mock}>Demo-läge: valfri e-post och lösenord fungerar.</T> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, marginBottom: spacing.xs },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  mock: { marginTop: spacing.lg },
});
