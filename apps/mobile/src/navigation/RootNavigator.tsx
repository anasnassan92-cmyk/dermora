import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../hooks/useAuth';
import { colors, fonts } from '../theme';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { VerifyEmailScreen } from '../features/auth/VerifyEmailScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { AssessmentScreen } from '../features/assessment/AssessmentScreen';
import { ImageUploadScreen } from '../features/images/ImageUploadScreen';
import { AnalyzingScreen } from '../features/ai-guidance/AnalyzingScreen';
import { ResultScreen } from '../features/ai-guidance/ResultScreen';
import { AIChatScreen } from '../features/ai-guidance/AIChatScreen';
import { TreatmentPlanScreen } from '../features/treatment-plan/TreatmentPlanScreen';
import { SavedPlanScreen } from '../features/treatment-plan/SavedPlanScreen';
import { HomeScreen } from '../features/treatment-plan/HomeScreen';
import type { AppStackParamList, AuthStackParamList, TabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.surface, card: colors.surfaceRaised, text: colors.ink, border: colors.line },
};

const headerOptions = {
  headerShadowVisible: false,
  headerTintColor: colors.inkBrand,
  headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.ink },
  headerStyle: { backgroundColor: colors.surface },
  headerBackTitle: 'Tillbaka',
} as const;

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconOn]}>
      <Text style={[styles.tabGlyph, focused && styles.tabGlyphOn]}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.inkBrand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surfaceRaised, borderTopColor: colors.line, height: 64, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Hem', tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} /> }} />
      <Tabs.Screen name="Plan" component={SavedPlanScreen} options={{ title: 'Plan', tabBarIcon: ({ focused }) => <TabIcon label="✓" focused={focused} /> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon label="●" focused={focused} /> }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return null; // splash is still visible

  return (
    <NavigationContainer theme={theme}>
      {!session ? (
        <AuthStack.Navigator screenOptions={headerOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: '' }} />
          <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: '' }} />
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: '', headerShown: false }} />
        </AuthStack.Navigator>
      ) : !session.emailVerified ? (
        <AuthStack.Navigator screenOptions={headerOptions}>
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} initialParams={{ email: session.email }} options={{ headerShown: false }} />
        </AuthStack.Navigator>
      ) : (
        <AppStack.Navigator screenOptions={headerOptions}>
          <AppStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
          <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Profil' }} />
          <AppStack.Screen name="Assessment" component={AssessmentScreen} options={{ title: 'Din hud' }} />
          <AppStack.Screen name="ImageUpload" component={ImageUploadScreen} options={{ title: 'Bild' }} />
          <AppStack.Screen name="Analyzing" component={AnalyzingScreen} options={{ headerShown: false, gestureEnabled: false }} />
          <AppStack.Screen name="Result" component={ResultScreen} options={{ title: 'Bedömning', headerBackVisible: false }} />
          <AppStack.Screen name="AIChat" component={AIChatScreen} options={{ title: 'Fråga Dermora' }} />
          <AppStack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} options={{ title: 'Din plan' }} />
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: colors.surfaceMint },
  tabGlyph: { fontSize: 16, color: colors.inkMuted },
  tabGlyphOn: { color: colors.inkBrand },
});
