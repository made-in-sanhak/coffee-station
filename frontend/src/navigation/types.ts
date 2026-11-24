import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Cafe, ReceiptDraft, RecommendationRequest } from '../app/domain';
import type { OwnerInviteCafe } from '../types/owner';
import type { MenuBoardCategory, MenuBoardMode } from '../types/menuBoard';

export type LoginReturnTarget =
  | { name: 'OwnerInvite'; params: { code?: string } | undefined }
  | { name: 'ReviewWrite'; params: { cafeId?: string } | undefined }
  | { name: 'ReviewDetail'; params: { reviewId: string } }
  | { name: 'MeetupCreate'; params: undefined }
  | { name: 'MeetupDetail'; params: { meetupId: string } };

export type RootStackParamList = {
  MidtermTest: undefined;
  Preference: undefined;
  Recommendation: undefined;
  Notification: undefined;
  Login: { owner?: boolean; returnTo?: LoginReturnTarget } | undefined;
  KakaoLogin: { returnTo?: LoginReturnTarget } | undefined;
  OwnerLogin: undefined;
  OwnerInvite: { code?: string } | undefined;
  OwnerStoreConfirm: { code: string; cafe: OwnerInviteCafe };
  OwnerMenuOnboarding: { cafe: OwnerInviteCafe };
  MenuBoardCapture: { mode: MenuBoardMode; cafe: OwnerInviteCafe };
  MenuBoardProcessing: undefined;
  MenuBoardReview: undefined;
  MenuRegisterDone: { count: number; counts: Record<MenuBoardCategory, number> };
  MenuBoardDiff: undefined;
  Map: undefined;
  Settings: undefined;
  Preferences: undefined;
  LocationPermission: undefined;
  PlaceSearch: undefined;
  CafeDetail: { cafeId: string; cafe?: Cafe };
  Compare: { menu?: string } | undefined;
  Recommend: undefined;
  RecommendationResult: { request: RecommendationRequest; proposalId?: string };
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
  OwnerMenus: { cafeId?: string; mode?: 'event'; refreshedAt?: number } | undefined;
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
