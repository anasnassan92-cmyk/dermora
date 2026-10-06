/** Design screen 03 – Verifiera din e-post (6-siffrig kod). Owner: Anas. */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Blob, Button, FlowHeader, Screen, T } from '../../components/ui';
import { DESIGN } from '../../constants/design';
import { useAuth } from '../../hooks/useAuth';
import type { AuthScreenProps } from '../../navigation/types';
import { authService } from '../../services/auth/authService';
import { colors, radius, shadow, spacing, typography } from '../../theme';

export function VerifyEmailScreen({ route }: AuthScreenProps<'VerifyEmail'>) {
  const { email } = route.params;
  const { refresh, isMock, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.verifyCode(email, code);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    await authService.resendVerification(email);
    setCountdown(30);
  };

  return (
    <Screen>
      <Blob />
      <FlowHeader step={2} onBack={signOut} />
      <Image source={DESIGN.envelope} style={styles.envelope} resizeMode="contain" />
      <T variant="display" center style={styles.title}>Verifiera din e-post</T>
      <T variant="body" muted center>Vi har skickat en 6-siffrig kod till</T>
      <T variant="bodyMedium" center mb="sm">{email}</T>
      <T variant="small" muted center mb="xl">Ange koden nedan för att slutföra din registrering.</T>

      <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel="Verifieringskod">
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.box, code.length === i && styles.boxActive]}>
            <T variant="h1" style={styles.digit}>{code[i] ?? ''}</T>
          </View>
        ))}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={styles.hiddenInput}
          accessibilityLabel="Sexsiffrig kod"
        />
      </Pressable>

      <T variant="small" muted center>Hittar du inte mejlet?</T>
      <View style={styles.resendRow}>
        <T variant="bodyMedium" color={countdown > 0 ? colors.inkMuted : colors.inkBrand} onPress={countdown > 0 ? undefined : resend}>Skicka ny kod</T>
        {countdown > 0 ? <T variant="bodyMedium" muted>  (00:{String(countdown).padStart(2, '0')})</T> : null}
      </View>
      {isMock ? <T variant="caption" muted center style={styles.mock}>Demo-läge: vilka sex siffror som helst fungerar.</T> : null}
      {error ? <T variant="small" color={colors.danger} center mb="md">{error}</T> : null}

      <Button title="Fortsätt  →" onPress={submit} disabled={code.length < 6} loading={loading} style={styles.cta} />
      <T variant="bodyMedium" color={colors.inkBrand} center onPress={signOut} accessibilityRole="link" style={styles.change}>
        Ändra e-postadress
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  envelope: { width: 200, height: 150, alignSelf: 'center', marginVertical: spacing.lg },
  title: { fontSize: 30, lineHeight: 36, marginBottom: spacing.sm },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  box: { width: 48, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  boxActive: { borderColor: colors.accent },
  digit: { marginBottom: 0 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1, ...typography.body },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  mock: { marginBottom: spacing.md },
  cta: { marginTop: spacing.md },
  change: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
