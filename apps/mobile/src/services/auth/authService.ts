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
  accounts: {
    id: {
      initialize: (o: object) => void;
      prompt: (cb?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
      renderButton: (el: HTMLElement, o: object) => void;
      cancel: () => void;
    };
  };
};

/**
 * One Tap only works when the browser already has a Google session (and FedCM allows it). When it is not shown,
 * we open a small overlay with Google's own "Fortsätt med Google" button, which always opens the account chooser.
 */
function gsiButtonOverlay(google: GoogleId, onCancel: () => void): HTMLElement {
  const overlay = document.createElement('div');
  overlay.setAttribute('style', 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(16,42,52,.45);padding:16px');
  const card = document.createElement('div');
  card.setAttribute('style', 'background:#FAF7F0;border-radius:20px;padding:24px 20px;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.25);text-align:center;font-family:Montserrat,system-ui,sans-serif;color:#102A34');
  card.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:6px">Välj ditt Google-konto</div><div style="font-size:14px;opacity:.75;margin-bottom:18px">Google öppnar ett litet fönster där du väljer konto.</div>';
  const slot = document.createElement('div');
  slot.setAttribute('style', 'display:flex;justify-content:center;margin-bottom:14px');
  card.appendChild(slot);
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Avbryt';
  cancel.setAttribute('style', 'background:none;border:0;color:#0F766E;font-weight:600;font-size:14px;cursor:pointer;padding:8px 16px');
  cancel.onclick = () => { overlay.remove(); onCancel(); };
  card.appendChild(cancel);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'sv', width: 280 });
  return overlay;
}

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

/** Native (APK/iOS): OAuth via the system browser with expo-auth-session; the id_token is verified by the server. */
async function nativeGoogleIdToken(androidClientId: string | null): Promise<string> {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || androidClientId;
  if (!clientId) throw new Error('Google-inloggning i appen är inte aktiverad ännu. Använd e-post så länge.');
  const [{ AuthRequest, ResponseType, makeRedirectUri }, Crypto] = await Promise.all([import('expo-auth-session'), import('expo-crypto')]);
  const nonce = Crypto.randomUUID().replace(/-/g, '');
  const request = new AuthRequest({
    clientId,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: makeRedirectUri({ native: 'se.dermora.app:/oauthredirect' }),
    usePKCE: false,
    extraParams: { nonce, prompt: 'select_account' },
  });
  const result = await request.promptAsync({ authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' });
  if (result.type !== 'success' || !result.params.id_token) throw new Error('Google-inloggningen avbröts.');
  return result.params.id_token;
}

async function googleIdToken(): Promise<string> {
  const cfg = (await (await fetch(`${API_URL}/config`)).json()) as { google_client_id: string | null; google_android_client_id?: string | null };
  if (Platform.OS !== 'web') return nativeGoogleIdToken(cfg.google_android_client_id ?? null);
  if (!cfg.google_client_id) throw new Error('Google-inloggning är inte aktiverad ännu. Använd e-post så länge.');
  const google = await loadGsi();
  return new Promise((resolve, reject) => {
    let overlay: HTMLElement | null = null;
    const done = (r: { credential?: string }) => {
      overlay?.remove();
      if (r.credential) resolve(r.credential);
      else reject(new Error('Google-inloggningen avbröts.'));
    };
    google.accounts.id.initialize({ client_id: cfg.google_client_id, callback: done, ux_mode: 'popup', use_fedcm_for_prompt: true });
    google.accounts.id.prompt((n) => {
      if ((n.isNotDisplayed() || n.isSkippedMoment()) && !overlay) {
        overlay = gsiButtonOverlay(google, () => reject(new Error('Google-inloggningen avbröts.')));
      }
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

  /** Forgot password step 1: the server e-mails a 6-digit code (demo mode: it is written to the server log). */
  async forgotPassword(email: string): Promise<{ demo: boolean }> {
    if (USE_MOCK_API) return { demo: true };
    const r = await post<{ ok: boolean; demo: boolean }>('/auth/forgot', { email: email.trim().toLowerCase() });
    return { demo: !!r.demo };
  },

  /** Forgot password step 2: code + new password → signed in and verified. */
  async resetPassword(email: string, code: string, password: string): Promise<void> {
    if (!/^\d{6}$/.test(code)) throw new Error('Ange de sex siffrorna från mejlet.');
    if (USE_MOCK_API) {
      await save({ userId: DEV_USER_ID, email: email.trim().toLowerCase(), emailVerified: true, accessToken: `dev:${DEV_USER_ID}` });
      return;
    }
    const r = await post<{ token: string; user: ServerUser }>('/auth/reset', { email: email.trim().toLowerCase(), code, password });
    await save(toSession(r.token, r.user));
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

  /** Account settings: both passwords are checked by the server. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (USE_MOCK_API) return;
    const s = await load();
    await post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }, s?.accessToken);
  },

  /** Change e-mail step 1: password + new address → a code is sent to the NEW address. */
  async changeEmail(password: string, newEmail: string): Promise<{ demo: boolean; newEmail: string }> {
    const email = newEmail.trim().toLowerCase();
    if (USE_MOCK_API) return { demo: true, newEmail: email };
    const s = await load();
    const r = await post<{ ok: boolean; demo: boolean; new_email: string }>('/auth/change-email', { password, new_email: email }, s?.accessToken);
    return { demo: !!r.demo, newEmail: r.new_email ?? email };
  },

  /** Change e-mail step 2: the code makes the new address the login address and the session is refreshed. */
  async confirmEmail(code: string, newEmail: string): Promise<void> {
    if (!/^\d{6}$/.test(code)) throw new Error('Ange de sex siffrorna från mejlet.');
    const s = await load();
    if (USE_MOCK_API) {
      if (s) await save({ ...s, email: newEmail });
      return;
    }
    const r = await post<{ token: string; user: ServerUser }>('/auth/confirm-email', { code }, s?.accessToken);
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
