import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Cafe, ReceiptDraft, RecommendationRequest } from '../app/domain';

export type RootStackParamList = {
  Preference: undefined;
  Recommendation: undefined;
  Notification: undefined;
  Login: { owner?: boolean } | undefined;
  KakaoLogin: undefined;
  Map: undefined;
  Settings: undefined;
  Preferences: undefined;
  LocationPermission: undefined;
  PlaceSearch: undefined;
  CafeDetail: { cafeId: string; cafe?: Cafe };
  Compare: { menu?: string } | undefined;
  Recommend: undefined;
  RecommendationResult: { request: RecommendationRequest };
  Community:
    | { tab?: 'reviews' | 'meetups'; cafeId?: string; cafeName?: string }
    | undefined;
  ReviewWrite: { cafeId?: string } | undefined;
  ReviewDetail: { reviewId: string };
  MeetupCreate: undefined;
  MeetupDetail: { meetupId: string };
  Receipt: undefined;
  ReceiptReview: { draft: ReceiptDraft };
  Calendar: undefined;
  Coupons: undefined;
  Garage: undefined;
  Owner: undefined;
  OwnerMenus: { cafeId?: string; mode?: 'event' } | undefined;
  Order: { dealId: string };
  PaymentPending: { orderId: string; paymentUrl?: string };
  OrderComplete: { orderId: string };
  PaymentFailure: { orderId?: string; reason?: string } | undefined;
  OwnerOrders: { cafeId?: string } | undefined;
  Events: undefined;
  OAuthLogin: {
    authorizationUrl: string;
    redirectUri: string;
    state: string;
    nonce: string;
    owner?: boolean;
  };
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
