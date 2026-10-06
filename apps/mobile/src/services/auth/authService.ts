/**
 * Auth service – owner: Anas.
 *
 * Real mode: Supabase Auth (email + password, email verification link).
 * Mock mode (no Supabase env): a fake session with the backend's dev user id,
 * so every teammate can run the whole app without accounts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const authService = {
  isMock: USE_MOCK_AUTH,

  async getSession(): Promise<Session | null> {
    if (USE_MOCK_AUTH) return mockSession();
    const { data } = await getSupabase().auth.getSession();
    const s = data.session;
    if (!s) return null;
    return {
      userId: s.user.id,
      email: s.user.email ?? '',
      emailVerified: Boolean(s.user.email_confirmed_at),
      accessToken: s.access_token,
    };
  },

  async signUp(email: string, password: string, displayName: string): Promise<{ needsVerification: boolean }> {
    if (USE_MOCK_AUTH) {
      const session: Session = { userId: DEV_USER_ID, email, emailVerified: false, accessToken: `dev:${DEV_USER_ID}` };
      await AsyncStorage.setItem(MOCK_KEY, JSON.stringify(session));
      return { needsVerification: true };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: 'dermora://verified' },
    });
    if (error) throw new Error(translate(error.message));
    return { needsVerification: !data.session };
  },

  async signIn(email: string, password: string): Promise<Session> {
    if (USE_MOCK_AUTH) {
      const session: Session = { userId: DEV_USER_ID, email, emailVerified: true, accessToken: `dev:${DEV_USER_ID}` };
      await AsyncStorage.setItem(MOCK_KEY, JSON.stringify(session));
      return session;
    }
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(translate(error.message));
    const s = data.session!;
    return {
      userId: s.user.id,
      email: s.user.email ?? '',
      emailVerified: Boolean(s.user.email_confirmed_at),
      accessToken: s.access_token,
    };
  },

  /** Mock only: simulate clicking the verification link. */
  async markVerified(): Promise<void> {
    const s = await mockSession();
    if (s) await AsyncStorage.setItem(MOCK_KEY, JSON.stringify({ ...s, emailVerified: true }));
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
  if (m.includes('password')) return 'Lösenordet måste vara minst 6 tecken.';
  if (m.includes('email not confirmed')) return 'Verifiera din e-post först.';
  return message;
}
