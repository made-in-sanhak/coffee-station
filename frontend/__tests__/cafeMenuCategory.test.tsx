import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import CafeDetailScreen from '../src/screens/cafe/CafeDetailScreen';
import { getMenuCategory } from '../src/screens/cafe/menuCategory';

const mockResources: Record<string, unknown> = {};
jest.mock('../src/app/api', () => ({
  useResource: (path: string) => ({
    data: mockResources[path],
    loading: false,
    error: null,
    reload: () => {},
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const menu = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  cafeId: '7',
  name,
  size: 'Regular',
  temperature: 'ICE',
  price: 2000 + Number(id) * 100,
  caffeineMg: null,
  available: true,
  ...extra,
});

test('server category wins and unknown names never fall back to coffee', () => {
  expect(getMenuCategory({ name: '아이스 아메리카노', caffeineMg: null, category: 'TEA' })).toBe('차');
  expect(getMenuCategory({ name: '오늘의 음료', caffeineMg: null, category: 'DECAF' })).toBe('디카페인');
  expect(getMenuCategory({ name: '아이스 아메리카노', caffeineMg: 150 })).toBe('커피');
  expect(getMenuCategory({ name: '디카페인 라떼', caffeineMg: null })).toBe('디카페인');
  expect(getMenuCategory({ name: '카페라떼', caffeineMg: 5 })).toBe('디카페인');
  expect(getMenuCategory({ name: '레몬 에이드', caffeineMg: 0 })).toBe('에이드·음료');
  expect(getMenuCategory({ name: '녹차라떼', caffeineMg: null })).toBe('차');
  expect(getMenuCategory({ name: '초코라떼', caffeineMg: null })).toBe('에이드·음료');
  expect(getMenuCategory({ name: '유자차', caffeineMg: null })).toBe('차');
  expect(getMenuCategory({ name: '시즌 한정 메뉴', caffeineMg: null })).toBe('에이드·음료');
  expect(getMenuCategory({ name: '시즌 한정 메뉴', caffeineMg: null, category: 'DESSERT' })).toBe('에이드·음료');
});

test('tabs open the first non-empty category, show three rows, expand in place and collapse on tab change', async () => {
  mockResources['/api/cafes/7'] = {
    id: '7', name: '분류 카페', address: '주소', latitude: 37.5, longitude: 127,
    rating: null, reviewCount: null, tags: [], verified: true, favorite: false, menus: [],
  };
  mockResources['/api/cafes/7/menus'] = [
    menu('1', '레몬 에이드'),
    menu('2', '자몽 에이드'),
    menu('3', '유자차'),
    menu('4', '딸기 스무디'),
    menu('5', '망고 주스'),
  ];
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn(), canGoBack: () => true };
  const props = {
    navigation,
    route: { key: 'CafeDetail', name: 'CafeDetail', params: { cafeId: '7' } },
  } as unknown as React.ComponentProps<typeof CafeDetailScreen>;
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<CafeDetailScreen {...props} />);
  });
  const tab = (name: string) =>
    tree.root.findAll(node => node.props.testID === `cafe-menu-tab-${name}` && typeof node.props.onPress === 'function')[0];
  const more = () =>
    tree.root.findAll(node => node.props.testID === 'cafe-menu-more' && typeof node.props.onPress === 'function')[0];
  const text = () => JSON.stringify(tree.toJSON());

  expect(tab('커피').props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect(tab('디카페인').props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect(tab('에이드·음료').props.accessibilityState).toEqual({ selected: true, disabled: false });
  expect(text()).toContain('레몬 에이드');
  expect(text()).not.toContain('망고 주스');
  expect(tree.root.findAllByType(Text).some(node => node.props.children === '에이드·음료 메뉴 전체 보기 ›')).toBe(true);

  await act(() => more().props.onPress());
  expect(text()).toContain('망고 주스');
  expect(tree.root.findAllByType(Text).some(node => node.props.children === '접기  ˄')).toBe(true);

  await act(() => tab('차').props.onPress());
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(text()).toContain('유자차');
  expect(text()).not.toContain('레몬 에이드');
  expect(more()).toBeUndefined();

  await act(() => tab('에이드·음료').props.onPress());
  expect(text()).not.toContain('망고 주스');
  await act(() => tree.unmount());
});

test('menus passed with the cafe stay expanded across re-renders', async () => {
  delete mockResources['/api/cafes/8'];
  delete mockResources['/api/cafes/8/menus'];
  const cafe = {
    id: '8', name: '지도 카페', address: '주소', latitude: 37.5, longitude: 127,
    menus: ['아메리카노', '카페라떼', '바닐라라떼', '콜드브루'].map((name, index) => menu(String(index + 1), name)),
  };
  const props = {
    navigation: { navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn(), canGoBack: () => true },
    route: { key: 'CafeDetail', name: 'CafeDetail', params: { cafeId: '8', cafe } },
  } as unknown as React.ComponentProps<typeof CafeDetailScreen>;
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<CafeDetailScreen {...props} />);
  });
  const more = () =>
    tree.root.findAll(node => node.props.testID === 'cafe-menu-more' && typeof node.props.onPress === 'function')[0];
  expect(JSON.stringify(tree.toJSON())).not.toContain('콜드브루');
  await act(() => more().props.onPress());
  await act(() => tree.update(<CafeDetailScreen {...props} />));
  expect(JSON.stringify(tree.toJSON())).toContain('콜드브루');
  await act(() => tree.unmount());
});
