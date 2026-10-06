import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_MOCK_AUTH } from '../../constants';

let client: SupabaseClient | null = null;

/** Lazily created so the app boots on mock auth without any Supabase config. */
export function getSupabase(): SupabaseClient {
  if (USE_MOCK_AUTH) throw new Error('Supabase är inte konfigurerat (EXPO_PUBLIC_SUPABASE_URL saknas)');
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
