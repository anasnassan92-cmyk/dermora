import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Icon } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profile/profileService';
import { colors, fonts } from '../theme';
import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { VerifyEmailScreen } from '../features/auth/VerifyEmailScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { ProfileSetupScreen } from '../features/profile/ProfileSetupScreen';
import { AssessmentIntroScreen } from '../features/assessment/AssessmentIntroScreen';
import { AssessmentScreen } from '../features/assessment/AssessmentScreen';
import { ImageUploadScreen } from '../features/images/ImageUploadScreen';
import { ImageReviewScreen } from '../features/images/ImageReviewScreen';
import { AnalyzingScreen } from '../features/ai-guidance/AnalyzingScreen';
import { ResultScreen } from '../features/ai-guidance/ResultScreen';
import { AIChatScreen } from '../features/ai-guidance/AIChatScreen';
import { TreatmentPlanScreen } from '../features/treatment-plan/TreatmentPlanScreen';
import { ConfirmPlanScreen } from '../features/treatment-plan/ConfirmPlanScreen';
import { PlanSavedScreen } from '../features/treatment-plan/PlanSavedScreen';
import { SavedPlanScreen } from '../features/treatment-plan/SavedPlanScreen';
import { HomeScreen } from '../features/treatment-plan/HomeScreen';
import { ScanTabScreen } from '../features/treatment-plan/ScanTabScreen';
import { ProgressTabScreen } from '../features/treatment-plan/ProgressTabScreen';
import type { AppStackParamList, AuthStackParamList, TabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

export const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.surface, card: colors.surfaceRaised, text: colors.ink, border: colors.line },
};

/** Flow screens draw their own back button + progress (FlowHeader), so the native header is hidden. */
export const stackOptions = { headerShown: false } as const;
export const headerOptions = {
  headerShadowVisible: false,
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.ink },
  headerStyle: { backgroundColor: colors.surface },
  headerBackTitle: 'Tillbaka',
  title: '',
} as const;

export const tabOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.inkBrand,
  tabBarInactiveTintColor: colors.inkMuted,
  tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
  tabBarStyle: { backgroundColor: colors.surfaceRaised, borderTopColor: colors.line, height: 66, paddingTop: 6 },
} as const;

export function MainTabs({ initial = 'Home' }: { initial?: keyof TabParamList }) {
  return (
    <Tabs.Navigator initialRouteName={initial} screenOptions={tabOptions}>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Hem', tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="Scan" component={ScanTabScreen} options={{ title: 'Skanna', tabBarIcon: ({ color }) => <Icon name="face-scan" size={22} color={color} /> }} />
      <Tabs.Screen name="Progress" component={ProgressTabScreen} options={{ title: 'Framsteg', tabBarIcon: ({ color }) => <Icon name="trend-up" size={22} color={color} /> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} /> }} />
    </Tabs.Navigator>
  );
}

/** Web only: the landing page links to app/?start=login|register. */
function startRoute(): keyof AuthStackParamList {
  if (typeof window === 'undefined' || !window.location) return 'Welcome';
  const start = new URLSearchParams(window.location.search).get('start');
  return start === 'login' ? 'Login' : start === 'register' ? 'Register' : 'Welcome';
}

export function RootNavigator() {
  const { session, loading } = useAuth();
  // Onboarding gate: a verified user without a basic profile starts on "Grundprofil" (design screen 04).
  const [needsProfile, setNeedsProfile] = useState<boolean | null>(null);
  const verified = !!session?.emailVerified;
  useEffect(() => {
    if (!verified) return setNeedsProfile(null);
    profileService
      .get()
      .then((p) => setNeedsProfile(!p.age_range))
      .catch(() => setNeedsProfile(false));
  }, [verified, session?.userId]);

  if (loading || (verified && needsProfile === null)) return null; // splash is still visible

  return (
    <NavigationContainer theme={navTheme}>
      {!session ? (
        <AuthStack.Navigator initialRouteName={startRoute()} screenOptions={stackOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </AuthStack.Navigator>
      ) : !session.emailVerified ? (
        <AuthStack.Navigator screenOptions={stackOptions}>
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} initialParams={{ email: session.email }} />
        </AuthStack.Navigator>
      ) : (
        <AppStack.Navigator initialRouteName={needsProfile ? 'ProfileSetup' : 'Tabs'} screenOptions={stackOptions}>
          <AppStack.Screen name="Tabs">{() => <MainTabs />}</AppStack.Screen>
          <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ ...headerOptions, headerShown: true, title: 'Profil' }} />
          <AppStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          <AppStack.Screen name="AssessmentIntro" component={AssessmentIntroScreen} />
          <AppStack.Screen name="Assessment" component={AssessmentScreen} />
          <AppStack.Screen name="ImageUpload" component={ImageUploadScreen} />
          <AppStack.Screen name="ImageReview" component={ImageReviewScreen} />
          <AppStack.Screen name="Analyzing" component={AnalyzingScreen} options={{ gestureEnabled: false }} />
          <AppStack.Screen name="Result" component={ResultScreen} options={{ ...headerOptions, headerShown: true, title: 'Din hudprofil' }} />
          <AppStack.Screen name="AIChat" component={AIChatScreen} />
          <AppStack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} />
          <AppStack.Screen name="ConfirmPlan" component={ConfirmPlanScreen} />
          <AppStack.Screen name="PlanSaved" component={PlanSavedScreen} options={{ gestureEnabled: false }} />
          <AppStack.Screen name="Plan" component={SavedPlanScreen} options={{ ...headerOptions, headerShown: true, title: 'Min plan' }} />
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  );
}
