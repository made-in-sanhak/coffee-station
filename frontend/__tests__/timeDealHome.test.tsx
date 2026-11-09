import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Modal, ScrollView, Text, TextInput } from 'react-native';
import EventsScreen from '../src/screens/events/EventsScreen';
import MapScreen from '../src/screens/map/MapScreen';
import { native } from '../src/app/native';
import TimeDealPromotion from '../src/screens/events/TimeDealPromotion';
import { usePromotionPreferences } from '../src/screens/events/promotionPreferences';
import type { Deal } from '../src/app/domain';

let mockData: Record<string, unknown> = {};
jest.mock('../src/app/api', () => ({
  useResource: (path: string) => ({
    data: mockData[path],
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));
jest.mock('../src/app/native', () => ({
  native: {
    secureGet: jest.fn(async () => null),
    secureSet: jest.fn(async () => undefined),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock(
  '../src/components/map/KakaoMapView',
  () => require('react-native').View,
);
const nav = { navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn() };
const now = new Date('2026-11-07T05:00:00Z');
const deal: Deal = {
  id: 'active',
  cafeId: 'cafe',
  cafeName: '등록 매장',
  menuId: 'menu',
  menuName: '라떼 세트',
  originalPrice: 10000,
  price: 8000,
  stock: 5,
  startsAt: '2026-11-07T04:59:00Z',
  endsAt: '2026-11-07T05:14:00Z',
  active: true,
};
const props = { navigation: nav, route: {} } as any;
const text = (tree: Renderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map(n => n.props.children)
    .flat(Infinity)
    .join(' ');
beforeEach(() => {
  usePromotionPreferences.setState({
    hiddenDay: null,
    ready: false,
    hydrating: false,
  });
  jest.useFakeTimers().setSystemTime(now);
  jest.clearAllMocks();
  (native.secureGet as jest.Mock).mockResolvedValue(null);
  mockData = {
    '/api/events': [
      { id: 'bad', title: '기간 전', description: '', dealId: 'missing' },
      {
        id: 'good',
        title: '등록 타임딜',
        description: '주문 할인',
        dealId: deal.id,
      },
      {
        id: 'other',
        title: '원두 행사',
        description: '새 원두',
        cafeId: 'another',
      },
    ],
    '/api/deals': [deal],
    '/api/cafes': [],
  };
});
afterEach(() => jest.useRealTimers());
test('an unusable first event does not hide the next live deal and the order bar stays outside scrolling content', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<EventsScreen {...props} />);
  });
  expect(tree!.root.findByType(Modal).props.visible).toBe(true);
  const bar = tree!.root.findAll(
    n =>
      n.props.accessibilityLabel === '타임딜 주문' &&
      typeof n.props.onPress === 'function',
  )[0];
  expect(bar).toBeDefined();
  let ancestor = bar.parent;
  while (ancestor) {
    expect(ancestor.type).not.toBe(ScrollView);
    ancestor = ancestor.parent;
  }
  await act(() => bar.props.onPress());
  expect(nav.navigate).toHaveBeenCalledWith('Order', { dealId: deal.id });
  expect(text(tree!)).toContain('영수증 3번 인증');
  await act(() => tree!.unmount());
});
test('the first Map screen offers a live deal and suppression closes only the popup', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<MapScreen {...props} />);
  });
  const popup = () =>
    tree!.root.findAllByType(Modal).find(m => m.props.animationType === 'fade');
  expect(popup()?.props.visible).toBe(true);
  const hide = tree!.root.findAll(
    n =>
      typeof n.props.onPress === 'function' &&
      n
        .findAllByType(Text)
        .some(t => t.props.children === '오늘 하루 보지 않기'),
  );
  await act(async () => hide.at(-1)!.props.onPress());
  expect(native.secureSet).toHaveBeenCalled();
  expect(popup()?.props.visible).toBe(false);
  expect(
    tree!.root.findAll(n => n.props.accessibilityLabel === '타임딜 주문')
      .length,
  ).toBeGreaterThan(0);
  await act(() => jest.advanceTimersByTime(15 * 60 * 1000));
  expect(
    tree!.root.findAll(n => n.props.accessibilityLabel === '타임딜 주문'),
  ).toHaveLength(0);
  await act(() => tree!.unmount());
});
test('event search filters actual event titles and descriptions', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<EventsScreen {...props} />);
  });
  const input = tree!.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === '이벤트 검색');
  expect(input).toBeDefined();
  await act(() => input!.props.onChangeText('원두'));
  expect(text(tree!)).toContain('원두 행사');
  expect(text(tree!)).not.toContain('기간 전');
  await act(() => tree!.unmount());
});

test('today suppression propagates to both mounted promotion surfaces', async () => {
  let first: Renderer.ReactTestRenderer, second: Renderer.ReactTestRenderer;
  await act(async () => {
    first = Renderer.create(<TimeDealPromotion navigation={nav} />);
    second = Renderer.create(<TimeDealPromotion navigation={nav} />);
  });
  expect(first!.root.findByType(Modal).props.visible).toBe(true);
  expect(second!.root.findByType(Modal).props.visible).toBe(true);
  const hide = second!.root
    .findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n
          .findAllByType(Text)
          .some(t => t.props.children === '오늘 하루 보지 않기'),
    )
    .at(-1)!;
  await act(async () => {
    await hide.props.onPress();
  });
  expect(first!.root.findByType(Modal).props.visible).toBe(false);
  expect(second!.root.findByType(Modal).props.visible).toBe(false);
  await act(() => {
    first!.unmount();
    second!.unmount();
  });
});
test('menu names in linked deals are searchable even with a generic event title', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<EventsScreen {...props} />);
  });
  const input = tree!.root
    .findAllByType(TextInput)
    .find(n => n.props.accessibilityLabel === '이벤트 검색')!;
  await act(() => input.props.onChangeText('라떼'));
  expect(text(tree!)).toContain('등록 타임딜');
  expect(text(tree!)).not.toContain('원두 행사');
  await act(() => tree!.unmount());
});
