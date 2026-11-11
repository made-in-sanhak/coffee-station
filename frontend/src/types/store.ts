export type MenuCategory = 'AMERICANO' | 'LATTE' | 'DECAF';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

// 기존 서버 매장 데이터
export interface Store extends Coordinate {
  id: number;
  name: string;
  address: string;
  distance: number;
  rating: number;
  reviewCount: number;
  menuName: string;
  price: number;
  priceSource: string;
  priceCheckedAt: string;
}

// 카카오맵 장소 검색 결과
export interface KakaoCafe extends Coordinate {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  distance: number;
  phone: string;
  categoryName: string;
  placeUrl: string;
  matchedStore?: Store;
}

export interface NearbyStoresParams extends Coordinate {
  radius: number;
  menu: MenuCategory;
}