/**
 * Auth service – owner: Anas.
 *
 * Real mode (EXPO_PUBLIC_API_URL set): the Dermora server (apps/server) – e-mail + password,
 * 6-digit e-mail code, Google sign-in (web). The token is kept in AsyncStorage.
 * Mock mode (no API URL): a fake local session so the app runs without any backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { API_URL, DEV_USER_ID, USE_MOCK_API } from '../../constants';

export interface Session {
  userId: string;
  email: string;
  firstName?: string | null;
  emailVerified: boolean;
  isAdmin?: boolean;
  accessToken: string;
}

interface ServerUser {
  id: string;
  email: string;
  first_name: string | null;
  email_verified: boolean;
  is_admin: boolean;
}

const KEY = 'dermora.session';
const DEV_CODE_KEY = 'dermora.dev-code';

async function save(session: Session | null) {
  if (session) await AsyncStorage.setItem(KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(KEY);
}

async function load(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

function toSession(token: string, u: ServerUser): Session {
  return { userId: u.id, email: u.email, firstName: u.first_name, emailVerified: u.email_verified, isAdmin: u.is_admin, accessToken: token };
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T & { detail?: string };
  if (!res.ok) throw new Error(data.detail || `Fel ${res.status}`);
  return data;
}

async function rememberDevCode(code?: string) {
  if (code) await AsyncStorage.setItem(DEV_CODE_KEY, code);
  else await AsyncStorage.removeItem(DEV_CODE_KEY);
}

// ---------- Google Identity Services (web) ----------
type GoogleId = {
  accounts: { id: { initialize: (o: object) => void; prompt: (cb?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void } };
};

function loadGsi(): Promise<GoogleId> {
  const w = window as unknown as { google?: GoogleId };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error('Google kunde inte laddas.')));
    s.onerror = () => reject(new Error('Google kunde inte laddas.'));
    document.head.appendChild(s);
  });
}

async function googleIdToken(): Promise<string> {
  if (Platform.OS !== 'web') throw new Error('Google-inloggning fungerar i webbappen. I mobilappen kommer den i nästa version.');
  const cfg = (await (await fetch(`${API_URL}/config`)).json()) as { google_client_id: string | null };
  if (!cfg.google_client_id) throw new Error('Google-inloggning är inte aktiverad ännu. Använd e-post så länge.');
  const google = await loadGsi();
  return new Promise((resolve, reject) => {
    google.accounts.id.initialize({ client_id: cfg.google_client_id, callback: (r: { credential?: string }) => (r.credential ? resolve(r.credential) : reject(new Error('Google-inloggningen avbröts.'))) });
    google.accounts.id.prompt((n) => {
      if (n.isNotDisplayed() || n.isSkippedMoment()) reject(new Error('Google-fönstret kunde inte visas. Tillåt popup-fönster eller använd e-post.'));
    });
  });
}

export const authService = {
  isMock: USE_MOCK_API,

  async getSession(): Promise<Session | null> {
    return load();
  },

  /** Demo mode only: the code the server could not e-mail (no SMTP configured yet). */
  async devCode(): Promise<string | null> {
    return AsyncStorage.getItem(DEV_CODE_KEY);
  },

  async signUp(input: { firstName: string; lastName: string; email: string; password: string }): Promise<{ needsVerification: boolean }> {
    if (USE_MOCK_API) {
      await save({ userId: DEV_USER_ID, email: input.email, firstName: input.firstName, emailVerified: false, accessToken: `dev:${DEV_USER_ID}` });
      await rememberDevCode('123456');
      return { needsVerification: true };
    }
    const r = await post<{ token: string; user: ServerUser; dev_code?: string }>('/auth/register', {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      password: input.password,
    });
    await save(toSession(r.token, r.user));
    await rememberDevCode(r.dev_code);
    return { needsVerification: !r.user.email_verified };
  },

  async verifyCode(_email: string, code: string): Promise<void> {
    if (!/^\d{6}$/.test(code)) throw new Error('Ange de sex siffrorna från mejlet.');
    const s = await load();
    if (USE_MOCK_API) {
      if (s) await save({ ...s, emailVerified: true });
      return;
    }
    if (!s) throw new Error('Logga in igen.');
    const r = await post<{ token: string; user: ServerUser }>('/auth/verify', { code }, s.accessToken);
    await save(toSession(r.token, r.user));
    await rememberDevCode(undefined);
  },

  async resendVerification(_email: string): Promise<void> {
    if (USE_MOCK_API) return;
    const s = await load();
    if (!s) return;
    const r = await post<{ dev_code?: string }>('/auth/resend', {}, s.accessToken);
    await rememberDevCode(r.dev_code);
  },

  async signIn(email: string, password: string): Promise<Session> {
    if (USE_MOCK_API) {
      const session: Session = { userId: DEV_USER_ID, email, emailVerified: true, accessToken: `dev:${DEV_USER_ID}` };
      await save(session);
      return session;
    }
    const r = await post<{ token: string; user: ServerUser; dev_code?: string }>('/auth/login', { email, password });
    const session = toSession(r.token, r.user);
    await save(session);
    await rememberDevCode(r.dev_code);
    return session;
  },

  async signInWithGoogle(): Promise<void> {
    if (USE_MOCK_API) {
      await save({ userId: DEV_USER_ID, email: 'demo@gmail.com', emailVerified: true, accessToken: `dev:${DEV_USER_ID}` });
      return;
    }
    const idToken = await googleIdToken();
    const r = await post<{ token: string; user: ServerUser }>('/auth/google', { id_token: idToken });
    await save(toSession(r.token, r.user));
  },

  async markVerified(): Promise<void> {
    const s = await load();
    if (s) await save({ ...s, emailVerified: true });
  },

  async signOut(): Promise<void> {
    await save(null);
    await rememberDevCode(undefined);
  },

  onChange(_callback: () => void): () => void {
    return () => {};
  },
};
