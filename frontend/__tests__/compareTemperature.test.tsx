import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import CompareScreen from '../src/screens/cafe/CompareScreen';
import { DEFAULT_PREFERENCES } from '../src/app/domain';
import { usePersonalStore } from '../src/store/personalStore';
import {
  useExploreSession,
  DEFAULT_MAP_CENTER,
} from '../src/screens/map/exploreSession';
const mockUseResource = jest.fn();
jest.mock('../src/app/api', () => ({
  useResource: (path: string, query: unknown) => mockUseResource(path, query),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
let tree: Renderer.ReactTestRenderer | undefined;
const request = () =>
  mockUseResource.mock.calls
    .filter(([path]) => path === '/api/menus/compare')
    .slice(-1)[0][1];
const average = () =>
  tree!.root.findAll(n => n.props.testID === 'comparison-average')[0].props
    .children;
async function mount(menu: string) {
  await act(async () => {
    tree = Renderer.create(
      <CompareScreen
        {...({
          navigation: { navigate: jest.fn(), goBack: jest.fn() },
          route: { params: { menu } },
        } as unknown as React.ComponentProps<typeof CompareScreen>)}
      />,
    );
  });
}
async function select(menu: string) {
  await act(() =>
    tree!.root
      .findAll(
        n =>
          n.props.testID === 'compare-menu' &&
          typeof n.props.onPress === 'function',
      )[0]
      .props.onPress(),
  );
  let option: Renderer.ReactTestInstance | null =
    tree!.root
      .findAll(n => n.props.children === menu)
      .find(n => n.parent?.props.accessibilityState !== undefined) ?? null;
  while (option && typeof option.props.onPress !== 'function')
    option = option.parent;
  await act(() => option!.props.onPress());
}
beforeEach(() => {
  mockUseResource
    .mockReset()
    .mockReturnValue({
      data: undefined,
      loading: false,
      error: null,
      reload: jest.fn(),
    });
  usePersonalStore.setState({
    preferences: {
      ...DEFAULT_PREFERENCES,
      temperatures: ['HOT'],
      sizes: ['Regular'],
    },
  });
  useExploreSession.setState({
    center: DEFAULT_MAP_CENTER,
    cafes: [
      {
        id: '1',
        name: '카페',
        address: '주소',
        latitude: 37.6,
        longitude: 126.8,
        menus: [
          {
            id: 'hot',
            cafeId: '1',
            name: '아메리카노',
            size: 'Regular',
            temperature: 'HOT',
            price: 2000,
            caffeineMg: null,
          },
          {
            id: 'ice',
            cafeId: '1',
            name: '아메리카노',
            size: 'Regular',
            temperature: 'ICE',
            price: 2500,
            caffeineMg: null,
          },
        ],
      },
    ],
  });
});
afterEach(async () => {
  await act(async () => {
    tree?.unmount();
  });
  tree = undefined;
});
test('HOT preference still requests ICE for an explicitly iced menu and displays the API price', async () => {
  mockUseResource.mockReturnValue({
    data: {
      items: [
        {
          cafeId: '1',
          cafeName: 'DB 카페',
          price: 2300,
          size: 'Regular',
          temperature: 'ICE',
        },
      ],
    },
    loading: false,
    error: null,
    reload: jest.fn(),
  });
  await mount('아이스 아메리카노');
  expect(request()).toMatchObject({
    menu: '아이스 아메리카노',
    temperature: 'ICE',
  });
  expect(average()).toBe('2,300원');
});
test('changing the menu recomputes request and cached option temperatures without changing preferences', async () => {
  await mount('아메리카노');
  expect(request().temperature).toBe('HOT');
  expect(average()).toBe('2,000원');
  await select('아이스 아메리카노');
  expect(request()).toMatchObject({
    menu: '아이스 아메리카노',
    temperature: 'ICE',
  });
  expect(average()).toBe('2,500원');
  await select('카페라떼');
  expect(request()).toMatchObject({ menu: '카페라떼', temperature: 'HOT' });
  expect(usePersonalStore.getState().preferences.temperatures).toEqual(['HOT']);
});
