import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, Input, Screen, T } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rules = [
    { ok: password.length >= 8, text: 'Minst 8 tecken' },
    { ok: /\d/.test(password), text: 'Minst en siffra' },
    { ok: /[A-ZÅÄÖ]/.test(password), text: 'Minst en stor bokstav' },
  ];
  const pwOk = rules.every((r) => r.ok);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Ange ditt fullständiga namn.');
    if (!email.includes('@')) return setError('Ange en giltig e-postadress.');
    if (!pwOk) return setError('Lösenordet uppfyller inte kraven.');
    if (!terms) return setError('Du måste godkänna villkoren.');
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
      <View style={styles.logo}>
        <Image source={require('../../../assets/logo/symbol.png')} style={styles.symbol} resizeMode="contain" />
        <T variant="h2" style={styles.wordmark}>Dermora</T>
        <T variant="caption" muted style={styles.tagline}>Din hud, förstådd</T>
      </View>
      <T variant="h1" mb="xs">Skapa ditt konto</T>
      <T variant="small" muted mb="xl">Bli en del av Dermora och få personlig hudvägledning.</T>

      <Input label="Fullständigt namn" value={name} onChangeText={setName} placeholder="Emma Andersson" autoComplete="name" />
      <Input label="E-postadress" value={email} onChangeText={setEmail} placeholder="emma@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <View>
        <Input label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry={!showPw} autoComplete="new-password" placeholder="••••••••" />
        <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eye} accessibilityRole="button" accessibilityLabel={showPw ? 'Dölj lösenord' : 'Visa lösenord'}>
          <Icon name={showPw ? 'eye-off' : 'eye'} size={20} color={colors.inkMuted} />
        </Pressable>
      </View>

      <View style={styles.rules}>
        {rules.map((r) => (
          <View key={r.text} style={styles.rule}>
            <View style={[styles.ruleDot, r.ok && styles.ruleDotOn]}>{r.ok ? <Icon name="check" size={10} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
            <T variant="caption" muted={!r.ok} color={r.ok ? colors.inkBrand : undefined}>{r.text}</T>
          </View>
        ))}
      </View>

      <Pressable onPress={() => setTerms((t) => !t)} style={styles.terms} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
        <View style={[styles.checkbox, terms && styles.checkboxOn]}>{terms ? <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
        <T variant="caption" style={styles.termsText}>
          Jag godkänner <T variant="caption" color={colors.inkBrand}>Användarvillkoren</T> och <T variant="caption" color={colors.inkBrand}>Integritetspolicyn</T>.
        </T>
      </Pressable>

      {error ? <T variant="small" color={colors.danger} mb="md">{error}</T> : null}
      <Button title="Skapa konto" onPress={submit} loading={loading} />
      <View style={styles.row}>
        <T variant="small" muted>Har du redan ett konto? </T>
        <T variant="small" color={colors.inkBrand} onPress={() => navigation.navigate('Login')} accessibilityRole="link">Logga in</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginBottom: spacing.xl },
  symbol: { width: 44, height: 38 },
  wordmark: { marginTop: spacing.xs, marginBottom: 0 },
  tagline: { marginTop: -2 },
  eye: { position: 'absolute', right: 14, top: 38, padding: 4 },
  rules: { marginTop: -spacing.sm, marginBottom: spacing.lg, gap: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  ruleDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderControl, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, borderRadius: radius.sm },
});
