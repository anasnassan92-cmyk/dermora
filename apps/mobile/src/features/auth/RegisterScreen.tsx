/** Design screen 02 – Skapa konto (Google + e-post). Owner: Anas. */
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Blob, Button, FlowHeader, Icon, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, radius, shadow, spacing } from '../../theme';
import { SITE_URL } from '../../constants';

function GoogleG() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <Path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </Svg>
  );
}

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { signUp, refresh } = useAuth();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pwOk = password.length >= 8 && /\d/.test(password) && /[A-Za-zÅÄÖåäö]/.test(password);

  const submit = async () => {
    setError(null);
    if (first.trim().length < 2) return setError('Ange ditt förnamn.');
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    if (!pwOk) return setError('Lösenordet måste ha minst 8 tecken, en siffra och en bokstav.');
    if (!terms) return setError('Du måste godkänna villkoren.');
    setLoading(true);
    try {
      const { needsVerification } = await signUp({ firstName: first.trim(), lastName: last.trim(), email: email.trim(), password });
      if (needsVerification) navigation.navigate('VerifyEmail', { email: email.trim() });
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
      <T variant="display" style={styles.title}>Skapa ditt konto</T>
      <T variant="body" muted mb="xl">Börja din resa mot bättre hud. Det tar mindre än en minut.</T>

      <Pressable onPress={google} style={styles.social} accessibilityRole="button">
        <GoogleG />
        <T variant="bodyMedium" style={styles.socialText}>Fortsätt med Google</T>
        <Icon name="chevron-right" size={20} color={colors.inkMuted} />
      </Pressable>

      <View style={styles.or}>
        <View style={styles.orLine} />
        <T variant="small" muted>eller</T>
        <View style={styles.orLine} />
      </View>

      <Input label="Förnamn" value={first} onChangeText={setFirst} placeholder="Alex" autoComplete="given-name" />
      <Input label="Efternamn" value={last} onChangeText={setLast} placeholder="Andersson" autoComplete="family-name" />
      <Input label="E-postadress" value={email} onChangeText={setEmail} placeholder="alex.andersson@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <View>
        <Input label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry={!showPw} autoComplete="new-password" placeholder="••••••••" hint="Minst 8 tecken, med en siffra och en bokstav." />
        <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eye} accessibilityRole="button" accessibilityLabel={showPw ? 'Dölj lösenord' : 'Visa lösenord'}>
          <Icon name={showPw ? 'eye-off' : 'eye'} size={20} color={colors.inkMuted} />
        </Pressable>
      </View>

      <Pressable onPress={() => setTerms((t) => !t)} style={styles.terms} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
        <View style={[styles.checkbox, terms && styles.checkboxOn]}>{terms ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
        <T variant="small" style={styles.termsText}>
          Jag godkänner Dermoras <T variant="small" color={colors.inkBrand} onPress={() => Linking.openURL(`${SITE_URL}/villkor.html`)} accessibilityRole="link">användarvillkor</T> och <T variant="small" color={colors.inkBrand} onPress={() => Linking.openURL(`${SITE_URL}/integritet.html`)} accessibilityRole="link">integritetspolicy</T>.
        </T>
      </Pressable>

      {error ? <T variant="small" color={colors.danger} mb="md">{error}</T> : null}
      <Button title="Skapa konto  →" onPress={submit} loading={loading} />
      <View style={styles.row}>
        <T variant="small" muted>Har du redan ett konto? </T>
        <T variant="small" color={colors.inkBrand} onPress={() => navigation.navigate('Login')} accessibilityRole="link">Logga in</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 32, lineHeight: 38, marginBottom: spacing.xs },
  social: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.lg, padding: spacing.lg, ...shadow.sm },
  socialText: { flex: 1, textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  eye: { position: 'absolute', right: 14, top: 38, padding: 4 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  termsText: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
});
