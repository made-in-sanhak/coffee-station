export type Id = string;
export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface Preferences {
  menus: string[];
  priceMax: number | null;
  purposes: string[];
  tastes: string[];
  sizes: string[];
  temperatures: string[];
  travelMode: 'walk' | 'drive';
  travelMinutes: number;
  cafeTypes?: string[];
}
export const DEFAULT_PREFERENCES: Preferences = {
  menus: ['아메리카노'],
  priceMax: null,
  purposes: [],
  tastes: [],
  sizes: ['기본'],
  temperatures: ['ICE'],
  travelMode: 'walk',
  travelMinutes: 10,
};
export interface Menu {
  id: Id;
  cafeId: Id;
  name: string;
  category?: string;
  size: string;
  temperature: string;
  price: number;
  caffeineMg: number | null;
  source?: string;
  checkedAt?: string;
  available?: boolean;
}
export type MenuInput = Omit<Menu, 'id' | 'cafeId'>;
export interface Cafe extends Coordinate {
  id: Id;
  name: string;
  address: string;
  brand?: string;
  phone?: string;
  placeUrl?: string;
  distance?: number;
  minPrice?: number | null;
  rating?: number | null;
  reviewCount?: number;
  closesAt?: string;
  tags?: string[];
  verified?: boolean;
  favorite?: boolean;
  menus?: Menu[];
}
export interface ComparisonItem {
  cafeId: Id;
  cafeName: string;
  distance?: number;
  rating?: number | null;
  price: number;
  size: string;
  temperature: string;
  source?: string;
  checkedAt?: string;
}
export interface Comparison {
  menuName: string;
  average: number | null;
  min: number | null;
  max: number | null;
  items: ComparisonItem[];
}
export interface RecommendationRequest {
  budget: number | null;
  purposes: string[];
  tastes: string[];
  travelMinutes: number;
  travelMode: 'walk' | 'drive';
  query: string;
  latitude?: number;
  longitude?: number;
}
export interface RecommendationItem {
  cafe: Cafe;
  score: number;
  reasons: string[];
  matchedMenu?: Menu;
}
export interface RecommendationResult {
  items: RecommendationItem[];
  mode: 'ai' | 'rules';
}
export interface ReceiptItem {
  menuName: string;
  quantity: number;
  unitPrice: number;
  caffeineMg: number | null;
  matchedMenuId?: Id;
}
export interface ReceiptDraft {
  id?: Id;
  imageUri?: string;
  storeName: string;
  purchasedAt: string;
  total: number;
  items: ReceiptItem[];
  verified: boolean;
}
export interface PurchaseInput {
  cafeId?: Id;
  cafeName: string;
  menuName: string;
  quantity: number;
  unitPrice: number;
  purchasedAt: string;
  caffeineMg: number | null;
  receiptId?: Id;
  source: 'manual' | 'ocr' | 'order';
}
export interface Purchase extends PurchaseInput {
  id: Id;
  total: number;
  verified: boolean;
}
export interface Coupon {
  id: Id;
  title: string;
  cafeId?: Id;
  cafeName?: string;
  type: 'FIXED' | 'PERCENT' | 'FREE_ITEM';
  value: number;
  minSpend: number;
  expiresAt: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  code?: string;
  usedAt?: string;
}
export interface AppUser {
  id: Id;
  nickname: string;
  profileImageUrl: string | null;
  role: 'USER' | 'OWNER' | 'ADMIN';
}
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AppUser;
}
export interface ReviewComment {
  id: Id;
  authorNickname: string;
  text: string;
  createdAt: string;
}
export interface Review {
  imageUrls?: string[];
  id: Id;
  cafeId: Id;
  cafeName: string;
  authorNickname: string;
  rating: number;
  text: string;
  category: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  commentCount: number;
  verified: boolean;
  comments?: ReviewComment[];
}
export interface MeetupMember {
  id: Id;
  nickname: string;
}
export interface Meetup {
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  id: Id;
  title: string;
  description: string;
  cafeId?: Id;
  placeName: string;
  address?: string;
  startsAt: string;
  capacity: number;
  memberCount: number;
  joined: boolean;
  category: string;
  hostNickname: string;
  members?: MeetupMember[];
}
export interface MeetupMessage {
  id: Id;
  authorNickname: string;
  text: string;
  createdAt: string;
}
export interface Deal {
  id: Id;
  cafeId: Id;
  cafeName: string;
  menuId: Id;
  menuName: string;
  originalPrice: number;
  price: number;
  stock: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  size?: string;
  temperature?: string;
}
export type DealInput = Omit<
  Deal,
  'id' | 'cafeName' | 'menuName' | 'originalPrice'
>;
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'ACCEPTED'
  | 'READY'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'FAILED';
export interface OrderQuote {
  dealId: Id;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  couponId?: Id;
  originalSubtotal?: number;
  dealDiscount?: number;
  couponDiscount?: number;
}
export interface Order extends OrderQuote {
  cancellationPending?: boolean;
  id: Id;
  cafeId: Id;
  cafeName: string;
  menuName: string;
  status: OrderStatus;
  pickupCode?: string;
  createdAt: string;
  paidAt?: string;
  paymentUrl?: string;
  pickupMinutes?: 10 | 20 | 30;
  requestNote?: string;
}
export interface PriceConfirmationRequest {
  id: Id;
  cafeId: Id;
  menuId: Id;
  menuName: string;
  currentPrice: number;
  reportedPrice: number;
  note: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}
export interface OwnerDashboard {
  selectedCafeId?: Id;
  detailViews?: number;
  directions?: number;
  verifiedReceipts?: number;
  detailViewsChange?: number | null;
  directionsChange?: number | null;
  verifiedReceiptsChange?: number | null;
  weeklyViews?: { date: string; count: number }[];
  priceRequests?: PriceConfirmationRequest[];
  cafes: Cafe[];
  todaySales: number;
  todayOrders: number;
  waitingOrders: number;
  reviewCount: number;
  menus: Menu[];
  deals: Deal[];
}
export interface Event {
  id: Id;
  title: string;
  description: string;
  cafeId?: Id;
  dealId?: Id;
  endsAt?: string;
  imageUrl?: string;
}
