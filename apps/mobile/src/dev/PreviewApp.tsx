/**
 * DEV ONLY – deterministic screen previews for screenshots and design review.
 *
 * Open the web build with ?preview=<Screen>[&q=<n>][&tab=<Tab>] and that screen renders
 * directly with seeded mock data, e.g.
 *   http://localhost:8081/?preview=Welcome
 *   http://localhost:8081/?preview=Assessment&q=2
 *   http://localhost:8081/?preview=Tabs&tab=Home
 * Used by scripts/screenshots.py to capture the design screens.
 * Never active in production builds (guarded in App.tsx by __DEV__ + web).
 */
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '../features/auth/WelcomeScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { VerifyEmailScreen } from '../features/auth/VerifyEmailScreen';
import { EditProfileScreen } from '../features/profile/EditProfileScreen';
import { MyInfoScreen } from '../features/profile/MyInfoScreen';
import { ChangePasswordScreen } from '../features/profile/ChangePasswordScreen';
import { ChangeEmailScreen } from '../features/profile/ChangeEmailScreen';
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
import { MainTabs, headerOptions, navTheme, stackOptions } from '../navigation/RootNavigator';
import type { AppStackParamList, AuthStackParamList, TabParamList } from '../navigation/types';
import { seedDemo, type DemoSeed } from '../services/mock/seed';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export function getPreviewParams(): { screen: string; q: number; tab?: string } | null {
  if (typeof window === 'undefined' || !window.location) return null;
  const sp = new URLSearchParams(window.location.search);
  const screen = sp.get('preview');
  if (!screen) return null;
  return { screen, q: Number(sp.get('q') ?? 0), tab: sp.get('tab') ?? undefined };
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
      <NavigationContainer theme={navTheme}>
        <AuthStack.Navigator initialRouteName={authScreens[screen]} screenOptions={stackOptions}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} initialParams={{ email: 'alex.andersson@email.com' }} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  const a = seed.assessmentId;
  const stackScreens = new Set(['EditProfile', 'MyInfo', 'ChangePassword', 'ChangeEmail', 'ProfileSetup', 'AssessmentIntro', 'Assessment', 'ImageUpload', 'ImageReview', 'Analyzing', 'Result', 'AIChat', 'TreatmentPlan', 'ConfirmPlan', 'PlanSaved', 'Plan']);
  const initial = (stackScreens.has(screen) ? screen : 'Tabs') as keyof AppStackParamList;
  const initialTab = (tab ?? 'Home') as keyof TabParamList;

  return (
    <NavigationContainer theme={navTheme}>
      <AppStack.Navigator initialRouteName={initial} screenOptions={stackOptions}>
        <AppStack.Screen name="Tabs">{() => <MainTabs initial={initialTab} />}</AppStack.Screen>
        <AppStack.Screen name="EditProfile" component={EditProfileScreen} options={{ ...headerOptions, headerShown: true, title: 'Profil' }} />
        <AppStack.Screen name="MyInfo" component={MyInfoScreen} options={{ ...headerOptions, headerShown: true, title: 'Mina uppgifter' }} />
        <AppStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ ...headerOptions, headerShown: true, title: 'Byt lösenord' }} />
        <AppStack.Screen name="ChangeEmail" component={ChangeEmailScreen} options={{ ...headerOptions, headerShown: true, title: 'Byt e-postadress' }} />
        <AppStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <AppStack.Screen name="AssessmentIntro" component={AssessmentIntroScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="Assessment" component={AssessmentScreen} initialParams={{ assessmentId: a, startIndex: q }} />
        <AppStack.Screen name="ImageUpload" component={ImageUploadScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="ImageReview" component={ImageReviewScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="Analyzing" component={AnalyzingScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="Result" component={ResultScreen} initialParams={{ assessmentId: a }} options={{ ...headerOptions, headerShown: true, title: 'Din hudprofil' }} />
        <AppStack.Screen name="AIChat" component={AIChatScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="TreatmentPlan" component={TreatmentPlanScreen} initialParams={{ assessmentId: a }} />
        <AppStack.Screen name="ConfirmPlan" component={ConfirmPlanScreen} initialParams={{ assessmentId: a, planId: seed.planId }} />
        <AppStack.Screen name="PlanSaved" component={PlanSavedScreen} initialParams={{ planId: seed.planId }} />
        <AppStack.Screen name="Plan" component={SavedPlanScreen} options={{ ...headerOptions, headerShown: true, title: 'Min plan' }} />
      </AppStack.Navigator>
    </NavigationContainer>
  );
}
