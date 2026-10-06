import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Screens before login. */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
};

/** Screens after login. One stack for the MVP journey + tabs for Home/Plan/Profile. */
export type AppStackParamList = {
  Tabs: undefined;
  EditProfile: undefined;
  Assessment: { assessmentId?: string };
  ImageUpload: { assessmentId: string };
  Analyzing: { assessmentId: string };
  Result: { assessmentId: string };
  AIChat: { assessmentId: string };
  TreatmentPlan: { assessmentId: string; planId?: string };
};

export type TabParamList = {
  Home: undefined;
  Plan: undefined;
  Profile: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;
