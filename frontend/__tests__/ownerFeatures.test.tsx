import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Modal, Text } from 'react-native';
import OwnerScreen from '../src/screens/owner/OwnerScreen';
import OwnerMenusScreen from '../src/screens/owner/OwnerMenusScreen';
import { api } from '../src/app/api';
const mockReload = jest.fn(),
  mockResource = jest.fn();
const mockCafes = [
  {
    id: 'cafe-a',
    name: '첫 매장',
    address: '서울',
    latitude: 37,
    longitude: 127,
  },
  {
    id: 'cafe-b',
    name: '둘째 매장',
    address: '고양',
    latitude: 37,
    longitude: 127,
  },
];
const mockRequest = {
  id: 'request-1',
  cafeId: 'cafe-a',
  menuId: 'menu-a',
  menuName: '카페라떼',
  currentPrice: 3000,
  reportedPrice: 3300,
  note: '메뉴판',
  status: 'OPEN',
  createdAt: '2026-11-07T03:00:00Z',
};
const mockDashboard = (id: string) => ({
  cafes: mockCafes,
  selectedCafeId: id,
  todaySales: 4000,
  todayOrders: 2,
  waitingOrders: 1,
  reviewCount: id === 'cafe-a' ? 4 : 8,
  menus: [
    {
      id: 'menu-a',
      cafeId: 'cafe-a',
      name: '카페라떼',
      price: 3000,
      size: 'Regular',
      temperature: 'ICE',
      available: true,
    },
  ],
  deals: [],
  detailViews: id === 'cafe-a' ? 1284 : 20,
  directions: 86,
  verifiedReceipts: 142,
  detailViewsChange: 12,
  directionsChange: null,
  verifiedReceiptsChange: -5,
  weeklyViews: [
    { date: '2026-11-06', count: 3 },
    { date: '2026-11-07', count: 5 },
  ],
  priceRequests: id === 'cafe-a' ? [mockRequest] : [],
});
jest.mock('../src/app/api', () => ({
  api: { post: jest.fn(), patch: jest.fn() },
  useResource: (path: string, query?: any) => {
    mockResource(path, query);
    if (path === '/api/owner/dashboard')
      return {
        data: mockDashboard(query?.cafeId ?? 'cafe-a'),
        loading: false,
        error: null,
        reload: mockReload,
      };
    return {
      data: path.includes('/menus') ? mockDashboard('cafe-a').menus : [],
      loading: false,
      error: null,
      reload: mockReload,
    };
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};
function action(tree: Renderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
}
function button(tree: Renderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(
    node =>
      node.props.label === label && typeof node.props.onPress === 'function',
  )[0];
}
function text(tree: Renderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat(Infinity)
    .join(' ');
}
beforeEach(() => {
  jest.clearAllMocks();
});

test('owner dashboard displays recorded metrics and daily chart instead of permanent placeholders', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerScreen navigation={navigation as never} route={{} as never} />,
    );
  });
  expect(text(tree!)).toContain('1,284');
  expect(text(tree!)).toContain('142');
  expect(text(tree!)).not.toContain('집계 대기');
  expect(
    tree!.root.findAll(
      node => node.props.accessibilityLabel === '2026-11-07 상세 조회 5회',
    ).length,
  ).toBeGreaterThan(0);
  await act(() => tree!.unmount());
});
test('selected owner cafe controls dashboard query, reviews destination and event editor destination', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerScreen navigation={navigation as never} route={{} as never} />,
    );
  });
  await act(() => action(tree!, '관리 매장 선택').props.onPress());
  await act(() => button(tree!, '둘째 매장').props.onPress());
  expect(mockResource).toHaveBeenLastCalledWith('/api/owner/dashboard', {
    cafeId: 'cafe-b',
  });
  const review = tree!.root.findAll(
    node =>
      node.props.title === '리뷰 관리' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(() => review.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Community', {
    tab: 'reviews',
    cafeId: 'cafe-b',
    cafeName: '둘째 매장',
  });
  const event = tree!.root.findAll(
    node =>
      node.props.title === '이벤트 등록' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(() => event.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('OwnerMenus', {
    cafeId: 'cafe-b',
    mode: 'event',
  });
  await act(() => tree!.unmount());
});
test('owner can inspect an actual price request and explicitly resolve a confirmed price', async () => {
  (api.post as jest.Mock).mockResolvedValue({
    ...mockRequest,
    status: 'RESOLVED',
  });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerScreen navigation={navigation as never} route={{} as never} />,
    );
  });
  await act(() => action(tree!, '가격 확인 요청 보기').props.onPress());
  expect(text(tree!)).toContain('3,300원');
  expect(text(tree!)).toContain('메뉴판');
  await act(async () => button(tree!, '현재 가격 확인 완료').props.onPress());
  expect(api.post).toHaveBeenCalledWith(
    '/api/owner/price-requests/request-1/resolve',
  );
  expect(mockReload).toHaveBeenCalled();
  await act(() => tree!.unmount());
});
test('event registration entry opens current deal editor directly after menus load', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerMenusScreen
        navigation={navigation as never}
        route={{ params: { cafeId: 'cafe-a', mode: 'event' } } as never}
      />,
    );
  });
  expect(
    tree!.root
      .findAllByType(Modal)
      .some(
        node =>
          node.props.visible && text(tree!).includes('타임딜 · 재고 관리'),
      ),
  ).toBe(true);
  await act(() => tree!.unmount());
});
