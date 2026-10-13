import type { MenuCategory, NearbyStoresParams, Store } from '../../types/store';

// 백엔드 API 가 나오기 전까지 쓰는 예시 데이터입니다. 매장·가격은 모두 가짜입니다.
interface MockStore {
  id: number;
  name: string;
  address: string;
  // 검색 중심에서 떨어진 정도 (위도·경도 차이)
  offset: [number, number];
  rating: number;
  reviewCount: number;
  prices: Record<MenuCategory, number | null>;
  priceSource: string;
  priceCheckedAt: string;
}

const MENU_NAMES: Record<MenuCategory, string> = {
  AMERICANO: '아메리카노',
  LATTE: '카페라테',
  DECAF: '디카페인 아메리카노',
};

const MOCK_STORES: MockStore[] = [
  {
    id: 1,
    name: '그린빈 카페',
    address: '예시로 24',
    offset: [-0.0006, -0.0012],
    rating: 4.6,
    reviewCount: 128,
    prices: { AMERICANO: 2500, LATTE: 3500, DECAF: 3000 },
    priceSource: '점주 확인',
    priceCheckedAt: '2026-10-06',
  },
  {
    id: 2,
    name: '로스터리 공방',
    address: '예시로 51',
    offset: [0.0021, 0.0016],
    rating: 4.4,
    reviewCount: 86,
    prices: { AMERICANO: 3500, LATTE: 4500, DECAF: null },
    priceSource: '영수증',
    priceCheckedAt: '2026-10-02',
  },
  {
    id: 3,
    name: '모퉁이 커피',
    address: '예시길 7',
    offset: [-0.0019, 0.0022],
    rating: 4.2,
    reviewCount: 41,
    prices: { AMERICANO: 3000, LATTE: 3800, DECAF: 3500 },
    priceSource: '영수증',
    priceCheckedAt: '2026-09-28',
  },
  {
    id: 4,
    name: '새벽 다방',
    address: '예시길 33',
    offset: [0.0011, -0.0027],
    rating: 4.7,
    reviewCount: 203,
    prices: { AMERICANO: 2000, LATTE: 3000, DECAF: 2500 },
    priceSource: '점주 확인',
    priceCheckedAt: '2026-10-09',
  },
  {
    id: 5,
    name: '정문 앞 커피',
    address: '예시로 102',
    offset: [-0.0031, -0.0008],
    rating: 4.0,
    reviewCount: 17,
    prices: { AMERICANO: 1800, LATTE: 2900, DECAF: null },
    priceSource: '영수증',
    priceCheckedAt: '2026-09-20',
  },
];

// 위도 1도 ≈ 111km, 경도 1도 ≈ 88km (서울 근처)
const toMeters = ([dLat, dLng]: [number, number]) =>
  Math.round(Math.hypot(dLat * 111_000, dLng * 88_000));

// 처음 요청한 위치를 기준으로 매장을 고정합니다. (지도를 움직여도 매장이 따라다니지 않도록)
let anchor: { latitude: number; longitude: number } | null = null;

export function getMockNearbyStores(params: NearbyStoresParams): Store[] {
  anchor ??= { latitude: params.latitude, longitude: params.longitude };
  const base = anchor;

  return MOCK_STORES.flatMap(store => {
    const price = store.prices[params.menu];
    if (price === null) {
      return [];
    }
    const latitude = base.latitude + store.offset[0];
    const longitude = base.longitude + store.offset[1];
    return [
      {
        id: store.id,
        name: store.name,
        address: store.address,
        latitude,
        longitude,
        distance: toMeters([
          latitude - params.latitude,
          longitude - params.longitude,
        ]),
        rating: store.rating,
        reviewCount: store.reviewCount,
        menuName: MENU_NAMES[params.menu],
        price,
        priceSource: store.priceSource,
        priceCheckedAt: store.priceCheckedAt,
      },
    ];
  });
}
