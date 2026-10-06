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

  // Web: keep the phone layout readable on desktop – a centred column, full width on phones.
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8E4DA' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#FAF7F0', overflow: 'hidden' }}>{app}</View>
      </View>
    );
  }
  return app;
}
