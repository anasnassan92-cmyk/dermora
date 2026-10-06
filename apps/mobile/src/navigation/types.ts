import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Screens before login. */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
};

/** Screens after login. One stack for the MVP journey + tabs (Hem, Skanna, Framsteg, Profil). */
export type AppStackParamList = {
  Tabs: { screen?: keyof TabParamList } | undefined;
  EditProfile: undefined;
  ProfileSetup: undefined; // onboarding 1/3
  AssessmentIntro: { assessmentId?: string } | undefined; // onboarding 2/3
  Assessment: { assessmentId?: string; startIndex?: number }; // onboarding 3/3 + follow-ups
  ImageUpload: { assessmentId: string };
  ImageReview: { assessmentId: string };
  Analyzing: { assessmentId: string };
  Result: { assessmentId: string };
  AIChat: { assessmentId: string };
  TreatmentPlan: { assessmentId: string; planId?: string };
  ConfirmPlan: { planId: string; assessmentId: string };
  PlanSaved: { planId: string };
  Plan: undefined; // saved plan (full view)
};

export type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Progress: undefined;
  Profile: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
