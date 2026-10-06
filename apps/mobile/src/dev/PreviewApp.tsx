/**
 * DEV ONLY – deterministic screen previews for screenshots and design review.
 *
 * Open the web build with ?preview=<Screen>[&q=<n>] and that screen renders
 * directly with seeded mock data, e.g.
 *   http://localhost:8081/?preview=Welcome
 *   http://localhost:8081/?preview=Assessment&q=2
 *   http://localhost:8081/?preview=Result
 * Used by scripts/screenshots.py to capture the 15 design screens.
 * Never active in production builds (guarded in App.tsx by __DEV__ + web).
 */
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Icon } from '../components/ui';
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
import { ChatTabScreen } from '../features/ai-guidance/ChatTabScreen';
import { TreatmentPlanScreen } from '../features/treatment-plan/TreatmentPlanScreen';
import { ConfirmPlanScreen } from '../features/treatment-plan/ConfirmPlanScreen';
import { PlanSavedScreen } from '../features/treatment-plan/PlanSavedScreen';
import { SavedPlanScreen } from '../features/treatment-plan/SavedPlanScreen';
import { HomeScreen } from '../features/treatment-plan/HomeScreen';
import type { AppStackParamList, AuthStackParamList, TabParamList } from '../navigation/types';
import { seedDemo, type DemoSeed } from '../services/mock/seed';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.surface, card: colors.surfaceRaised, text: colors.ink, border: colors.line } };
const headerOptions = { headerShadowVisible: false, headerTintColor: colors.ink, headerTitleStyle: { fontFamily: fonts.semiBold, color: colors.ink }, headerStyle: { backgroundColor: colors.surface }, title: '' } as const;

export function getPreviewParams(): { screen: string; q: number; tab?: string } | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const sp = new URLSearchParams(window.location.search);
  const screen = sp.get('preview');
  if (!screen) return null;
  return { screen, q: Number(sp.get('q') ?? 0), tab: sp.get('tab') ?? undefined };
}

function TabsPreview({ initial }: { initial: keyof TabParamList }) {
  return (
    <Tabs.Navigator
      initialRouteName={initial}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.inkBrand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surfaceRaised, borderTopColor: colors.line, height: 64, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Hem', tabBarIcon: ({ color }) => <Icon name="home" size={22} color={color} /> }} />
      <Tabs.Screen name="Plan" component={SavedPlanScreen} options={{ title: 'Min plan', tabBarIcon: ({ color }) => <Icon name="checklist" size={22} color={color} /> }} />
      <Tabs.Screen name="Chat" component={ChatTabScreen} options={{ title: 'Chat', tabBarIcon: ({ color }) => <Icon name="chat" size={22} color={color} /> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil', tabBarIcon: ({ color }) => <Icon name="user" size={22} color={color} /> }} />
    </Tabs.Navigator>
  );
}

export function PreviewApp({ screen, q, tab }: { screen: string; q: number; tab?: string }) {
  const [seed, setSeed] = useState<DemoSeed | null>(null);
  useEffect(() => {
    seedDemo(screen).then(setSeed);
  }, [screen]);
  if (!seed) return null;

  const authScreens: Record<string, keyof AuthStackParamList> = { Welcome: 'Welcome', Login: 'Login', Register: 'Register', VerifyEmail: 'VerifyEmail' };
  if (authScreens[screen]) {
    return (
      <NavigationContainer theme={theme}>
        <AuthStack.Navigator initialRouteName={authScreens[screen]} screenOptions={headerOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} initialParams={{ email: 'emma@example.com' }} options={{ headerShown: false }} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  const a = seed.assessmentId;
  const initialParams: Partial<Record<keyof AppStackParamList, object>> = {
    AssessmentIntro: { assessmentId: a },
    Assessment: { assessmentId: a, startIndex: q },
    ImageUpload: { assessmentId: a },
    ImageReview: { assessmentId: a },
    Analyzing: { assessmentId: a },
    Result: { assessmentId: a },
    AIChat: { assessmentId: a },
    TreatmentPlan: { assessmentId: a },
    ConfirmPlan: { assessmentId: a, planId: seed.planId },
    PlanSaved: { planId: seed.planId },
  };
  const initial = (screen in initialParams || screen === 'EditProfile' || screen === 'ProfileSetup' ? screen : 'Tabs') as keyof AppStackParamList;

  return (
    <NavigationContainer theme={theme}>
      <AppStack.Navigator initialRouteName={initial} screenOptions={headerOptions}>
        <AppStack.Screen name="Tabs" options={{ headerShown: false }}>
          {() => <TabsPreview initial={(tab ?? (screen === 'Tabs' ? 'Home' : screen)) as keyof TabParamList} />}
        </AppStack.Screen>
        <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Profil' }} />
        <AppStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <AppStack.Screen name="AssessmentIntro" component={AssessmentIntroScreen} initialParams={initialParams.AssessmentIntro} />
        <AppStack.Screen name="Assessment" component={AssessmentScreen} initialParams={initialParams.Assessment} />
        <AppStack.Screen name="ImageUpload" component={ImageUploadScreen} initialParams={initialParams.ImageUpload} />
        <AppStack.Screen name="ImageReview" component={ImageReviewScreen} initialParams={initialParams.ImageReview} />
        <AppStack.Screen name="Analyzing" component={AnalyzingScreen} initialParams={initialParams.Analyzing} options={{ headerShown: false }} />
        <AppStack.Screen name="Result" component={ResultScreen} initialParams={initialParams.Result} options={{ title: 'Bedömning', headerBackVisible: false }} />
        <AppStack.Screen name="AIChat" component={AIChatScreen} initialParams={initialParams.AIChat} options={{ headerShown: false }} />
        <AppStack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} initialParams={initialParams.TreatmentPlan} options={{ headerBackVisible: false }} />
        <AppStack.Screen name="ConfirmPlan" component={ConfirmPlanScreen} initialParams={initialParams.ConfirmPlan} />
        <AppStack.Screen name="PlanSaved" component={PlanSavedScreen} initialParams={initialParams.PlanSaved} options={{ headerShown: false }} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
}
