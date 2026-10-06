import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setTokenGetter } from '../services/api/client';
import { authService, type Session } from '../services/auth/authService';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isMock: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsVerification: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  markVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSession(await authService.getSession());
  }, []);

  useEffect(() => {
    setTokenGetter(async () => (await authService.getSession())?.accessToken ?? null);
    refresh().finally(() => setLoading(false));
    return authService.onChange(() => {
      void refresh();
    });
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isMock: authService.isMock,
      signIn: async (email, password) => {
        setSession(await authService.signIn(email, password));
      },
      signUp: async (email, password, displayName) => {
        const r = await authService.signUp(email, password, displayName);
        await refresh();
        return r;
      },
      signOut: async () => {
        await authService.signOut();
        setSession(null);
      },
      refresh,
      markVerified: async () => {
        await authService.markVerified();
        await refresh();
      },
    }),
    [session, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
