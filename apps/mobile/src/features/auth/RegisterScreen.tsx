import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { spacing } from '../../theme';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Ange ditt namn.');
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    if (password.length < 6) return setError('Lösenordet måste vara minst 6 tecken.');
    setLoading(true);
    try {
      const { needsVerification } = await signUp(email.trim(), password, name.trim());
      if (needsVerification) navigation.navigate('VerifyEmail', { email: email.trim() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T variant="h1" mb="sm">Skapa konto</T>
      <T muted mb="xl">Det tar en minut. Vi skickar en länk för att verifiera din e-post.</T>
      <Input label="Namn" value={name} onChangeText={setName} autoComplete="name" />
      <Input label="E-post" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" hint="Minst 6 tecken" error={error} />
      <Button title="Skapa konto" onPress={submit} loading={loading} />
      <T variant="caption" muted center style={styles.terms}>
        Genom att skapa konto godkänner du våra användarvillkor. Dermora ger vägledning, inte medicinsk diagnos.
      </T>
      <View style={styles.row}>
        <T muted>Har du redan ett konto? </T>
        <T color="#04776B" onPress={() => navigation.navigate('Login')} accessibilityRole="link">
          Logga in
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
