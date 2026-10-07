/**
 * Runtime configuration. Values prefixed EXPO_PUBLIC_ are inlined by Expo at build time.
 * Leave EXPO_PUBLIC_API_URL empty to run the app fully on mock data (no backend).
 */
/** Base URL of the Dermora server API, e.g. "/api" (same site) or "http://192.168.1.20:4000/api". */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** Web only: ?preview=<Screen> renders one screen with seeded demo data (design review, Figma import). */
export const PREVIEW_MODE = typeof window !== 'undefined' && !!window.location && new URLSearchParams(window.location.search).has('preview');

export const USE_MOCK_API = API_URL.length === 0 || PREVIEW_MODE;
export const USE_MOCK_AUTH = USE_MOCK_API;

export const APP_NAME = 'Dermora';
export const TAGLINE = 'Din hud, förstådd.';
export const DISCLAIMER = 'Dermora ger vägledning, inte medicinsk diagnos. Kontakta vården vid oro.';

/** Fixed dev user id accepted by the backend when DEV_AUTH=true. */
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
