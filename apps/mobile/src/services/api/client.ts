/**
 * Thin HTTP client for the Dermora API. Every request carries the current
 * access token. Screens never call fetch directly – they go through a
 * feature service (assessmentService, imageStorageService, ...).
 */
import { API_URL } from '../../constants';

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter = async () => null;

/** Current access token (for raw fetches such as the streaming chat). */
export async function authToken(): Promise<string | null> {
  return getToken();
}

/** Called once by the AuthProvider so the client can attach tokens. */
export function setTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    const detail = (data as { detail?: unknown })?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray((detail as { errors?: string[] })?.errors)
          ? (detail as { errors: string[] }).errors.join('\n')
          : `Fel ${res.status}`;
    throw new ApiError(res.status, message, detail);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};
