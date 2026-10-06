/**
 * Runtime configuration. Values prefixed EXPO_PUBLIC_ are inlined by Expo at build time.
 * Leave them empty to run the app fully on mock data (no backend, no Supabase).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const USE_MOCK_API = API_URL.length === 0;
export const USE_MOCK_AUTH = SUPABASE_URL.length === 0 || SUPABASE_ANON_KEY.length === 0;

export const APP_NAME = 'Dermora';
export const TAGLINE = 'Din hud, förstådd.';
export const DISCLAIMER = 'Dermora ger vägledning, inte medicinsk diagnos. Kontakta vården vid oro.';

/** Fixed dev user id accepted by the backend when DEV_AUTH=true. */
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
