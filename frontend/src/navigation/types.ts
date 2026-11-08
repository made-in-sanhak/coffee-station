import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RecommendationConditions = {
  prompt: string;
  budget: '' | '3천원 이하' | '5천원 이하' | '상관없음';
  purpose: string;
  tastes: string[];
  distance: string;
};

export type RootStackParamList = {
  Login: undefined;
  KakaoLogin: undefined;
  Preference: undefined;
  Map: undefined;
  Notification: undefined;
  Recommendation: undefined;
  RecommendationResult: RecommendationConditions;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
