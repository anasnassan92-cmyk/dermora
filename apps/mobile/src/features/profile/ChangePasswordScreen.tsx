/** Byt lösenord – current + new password. Owner: Anas. */
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { Button, Input, Screen, T } from '../../components/ui';
import type { AppScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { spacing } from '../../theme';

export function ChangePasswordScreen({ navigation }: AppScreenProps<'ChangePassword'>) {
  const [current, setCurrent] = useState('');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    authService.me().then((u) => setHasPassword(u?.has_password !== false)).catch(() => setHasPassword(true));
  }, []);
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (next !== repeat) return setError('De nya lösenorden matchar inte.');
    setLoading(true);
    try {
      await authService.changePassword(hasPassword ? current : null, next);
      Alert.alert('Klart', hasPassword ? 'Ditt lösenord är ändrat.' : 'Ditt lösenord är sparat. Nu kan du logga in med e-post och lösenord också.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T variant="h1" mb="xs">{hasPassword === false ? 'Skapa lösenord' : 'Byt lösenord'}</T>
      <T muted mb="xl">{hasPassword === false ? 'Du loggar in med Google. Välj ett lösenord om du också vill kunna logga in med e-post.' : 'Skriv ditt nuvarande lösenord och välj ett nytt.'}</T>
      {hasPassword === false ? null : <Input label="Nuvarande lösenord" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" />}
      <Input label="Nytt lösenord" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" hint="Minst 8 tecken, med en siffra och en bokstav." />
      <Input label="Upprepa nytt lösenord" value={repeat} onChangeText={setRepeat} secureTextEntry autoComplete="new-password" error={error} />
      <Button title={hasPassword === false ? 'Spara lösenord' : 'Spara nytt lösenord'} onPress={submit} loading={loading} disabled={hasPassword === null || (hasPassword && !current) || next.length < 8 || !repeat} style={styles.btn} />
    </Screen>
  );
}

const styles = StyleSheet.create({ btn: { marginTop: spacing.md } });
