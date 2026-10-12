export type MenuCategory = 'AMERICANO' | 'LATTE' | 'DECAF';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

// 지도에 표시되는 매장 한 곳 (가격은 요청한 메뉴 기준)
export interface Store extends Coordinate {
  id: number;
  name: string;
  address: string;
  distance: number; // 검색 중심에서의 거리(m)
  rating: number;
  reviewCount: number;
  menuName: string;
  price: number;
  priceSource: string; // 예: '점주 확인', '영수증'
  priceCheckedAt: string; // YYYY-MM-DD
}

export interface NearbyStoresParams extends Coordinate {
  radius: number; // m
  menu: MenuCategory;
}
