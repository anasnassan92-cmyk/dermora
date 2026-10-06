/**
 * Auth service – owner: Anas.
 *
 * Real mode: Supabase Auth (email + password with a 6-digit e-mail code, or Google).
 * Mock mode (no Supabase env): a fake session with the backend's dev user id,
 * so every teammate can run the whole app without accounts.
 *
 * Supabase setup for the 6-digit code: Authentication → Email Templates → "Confirm signup":
 * replace the link with {{ .Token }} so the mail contains the code instead of a link.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DEV_USER_ID, USE_MOCK_AUTH } from '../../constants';
import { getSupabase } from './supabaseClient';

export interface Session {
  userId: string;
  email: string;
  emailVerified: boolean;
  accessToken: string;
}

const MOCK_KEY = 'dermora.mock-session';

async function mockSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(MOCK_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

async function setMock(session: Session) {
  await AsyncStorage.setItem(MOCK_KEY, JSON.stringify(session));
}

function fromSupabase(s: { user: { id: string; email?: string; email_confirmed_at?: string | null }; access_token: string }): Session {
  return { userId: s.user.id, email: s.user.email ?? '', emailVerified: Boolean(s.user.email_confirmed_at), accessToken: s.access_token };
}

export const authService = {
  isMock: USE_MOCK_AUTH,

  async getSession(): Promise<Session | null> {
    if (USE_MOCK_AUTH) return mockSession();
    const { data } = await getSupabase().auth.getSession();
    return data.session ? fromSupabase(data.session) : null;
  },

  async signUp(email: string, password: string, displayName: string): Promise<{ needsVerification: boolean }> {
    if (USE_MOCK_AUTH) {
      await setMock({ userId: DEV_USER_ID, email, emailVerified: false, accessToken: `dev:${DEV_USER_ID}` });
      return { needsVerification: true };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(translate(error.message));
    return { needsVerification: !data.session };
  },

  /** Verify the 6-digit code from the sign-up e-mail. */
  async verifyCode(email: string, code: string): Promise<void> {
    if (USE_MOCK_AUTH) {
      if (!/^\d{6}$/.test(code)) throw new Error('Ange de sex siffrorna från mejlet.');
      const s = await mockSession();
      if (s) await setMock({ ...s, emailVerified: true });
      return;
    }
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'signup' });
    if (error) {
      // a user who already confirmed and is logging in again gets type 'email'
      const retry = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
      if (retry.error) throw new Error(translate(error.message));
    }
  },

  async signIn(email: string, password: string): Promise<Session> {
    if (USE_MOCK_AUTH) {
      const session: Session = { userId: DEV_USER_ID, email, emailVerified: true, accessToken: `dev:${DEV_USER_ID}` };
      await setMock(session);
      return session;
    }
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(translate(error.message));
    return fromSupabase(data.session!);
  },

  /** Google sign-in via Supabase OAuth. Works on web out of the box; on native it opens the browser flow. */
  async signInWithGoogle(): Promise<void> {
    if (USE_MOCK_AUTH) {
      await setMock({ userId: DEV_USER_ID, email: 'demo@gmail.com', emailVerified: true, accessToken: `dev:${DEV_USER_ID}` });
      return;
    }
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'dermora://auth';
    const { error } = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw new Error(translate(error.message));
  },

  /** Mock only: simulate the verification without a code. */
  async markVerified(): Promise<void> {
    const s = await mockSession();
    if (s) await setMock({ ...s, emailVerified: true });
  },

  async resendVerification(email: string): Promise<void> {
    if (USE_MOCK_AUTH) return;
    const { error } = await getSupabase().auth.resend({ type: 'signup', email });
    if (error) throw new Error(translate(error.message));
  },

  async signOut(): Promise<void> {
    if (USE_MOCK_AUTH) {
      await AsyncStorage.removeItem(MOCK_KEY);
      return;
    }
    await getSupabase().auth.signOut();
  },

  onChange(callback: () => void): () => void {
    if (USE_MOCK_AUTH) return () => {};
    const { data } = getSupabase().auth.onAuthStateChange(() => callback());
    return () => data.subscription.unsubscribe();
  },
};

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Fel e-post eller lösenord.';
  if (m.includes('already registered')) return 'E-postadressen är redan registrerad.';
  if (m.includes('token has expired') || m.includes('invalid')) return 'Koden är fel eller har gått ut. Skicka en ny kod.';
  if (m.includes('password')) return 'Lösenordet måste vara minst 8 tecken.';
  if (m.includes('email not confirmed')) return 'Verifiera din e-post först.';
  return message;
}
