import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Platform, View } from 'react-native';

import { AuthProvider } from './src/hooks/useAuth';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PreviewApp, getPreviewParams } from './src/dev/PreviewApp';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Web only: paints the page body with the Dermora brand background (behind the phone column). */
function WebBackdrop() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const body = document.body;
    const prev = body.style.background;
    // ../assets/… resolves from /app/ to the landing page's assets on the same host
    body.style.background = 'linear-gradient(160deg, #0C9387 0%, #088579 55%, #04776B 100%) fixed';
    body.style.backgroundImage = 'url(../assets/patterns/bubbles-teal-soft.svg), linear-gradient(160deg, #0C9387 0%, #088579 55%, #04776B 100%)';
    body.style.backgroundSize = '280px, cover';
    body.style.backgroundAttachment = 'fixed, fixed';
    return () => { body.style.background = prev; };
  }, []);
  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Montserrat-Regular': require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('./assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('./assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // DEV ONLY: ?preview=<Screen> renders one screen with seeded mock data (screenshots / design review)
  const preview = __DEV__ && Platform.OS === 'web' ? getPreviewParams() : null;
  if (preview) {
    return (
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          {/* fixed 390px phone frame so headless screenshots are deterministic regardless of window size */}
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8E4DA' }}>
            <View style={{ width: 390, flex: 1, overflow: 'hidden', backgroundColor: '#FAF7F0' }}>
              <PreviewApp {...preview} />
            </View>
          </View>
        </AuthProvider>
      </SafeAreaProvider>
    );
  }

  const app = (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );

  // Web: keep the phone layout readable on desktop – a centred column on the brand background
  // (teal + bubbles pattern from the landing page), full width on phones.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'transparent' }}>
        <WebBackdrop />
        <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#FAF7F0', overflow: 'hidden', boxShadow: '0 0 60px rgba(0,0,0,0.25)' }}>{app}</View>
      </View>
    );
  }
  return app;
}
