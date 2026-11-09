import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking, TextInput } from 'react-native';
import MapScreen from '../src/screens/map/MapScreen';
import PlaceSearchScreen from '../src/screens/map/PlaceSearchScreen';
import LocationPermissionScreen from '../src/screens/onboarding/LocationPermissionScreen';
import CafeDetailScreen from '../src/screens/cafe/CafeDetailScreen';
import CompareScreen from '../src/screens/cafe/CompareScreen';
import { DEFAULT_PREFERENCES } from '../src/app/domain';
import { usePersonalStore } from '../src/store/personalStore';
import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import {
  DEFAULT_MAP_CENTER,
  useExploreSession,
} from '../src/screens/map/exploreSession';

const mockResources: Record<string, unknown> = {};
const mockSecureSet = jest.fn().mockResolvedValue(undefined);
const mockRequestLocation = jest.fn();
const mockRecognizeSpeech = jest.fn();
jest.mock('../src/app/api', () => ({
  useResource: (path: string) => ({
    data: mockResources[path],
    loading: false,
    error: null,
    reload: () => {},
  }),
}));
jest.mock('../src/app/native', () => ({
  native: {
    secureSet: (...args: unknown[]) => mockSecureSet(...args),
    requestLocation: () => mockRequestLocation(),
    recognizeSpeech: () => mockRecognizeSpeech(),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('react-native-webview', () => {
  const renderer = require('react');
  const { View } = require('react-native');
  return {
    WebView: renderer.forwardRef(function MockWebView(
      props: Record<string, unknown>,
      ref: unknown,
    ) {
      renderer.useImperativeHandle(ref, () => ({ injectJavaScript: () => {} }));
      return renderer.createElement(View, props);
    }),
  };
});

const navigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
  canGoBack: () => true,
});
const byId = (tree: Renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll(
    node =>
      node.props.testID === id && typeof node.props.onPress === 'function',
  )[0];
const byLabel = (tree: Renderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    node =>
      node.props.label === label && typeof node.props.onPress === 'function',
  )[0];
const props = <T,>(nav: ReturnType<typeof navigation>, params?: unknown) =>
  ({ navigation: nav, route: { params } } as unknown as T);

beforeEach(() => {
  jest.useFakeTimers();
  mockSecureSet.mockReset().mockResolvedValue(undefined);
  mockRequestLocation.mockReset();
  mockRecognizeSpeech.mockReset();
  Object.keys(mockResources).forEach(key => delete mockResources[key]);
  usePersonalStore.setState({
    preferences: {
      ...DEFAULT_PREFERENCES,
      menus: ['아이스 아메리카노'],
      sizes: ['Large'],
    },
    hydrated: true,
    onboarded: false,
    purchases: [],
    favoriteIds: [],
  });
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-only' });
  useExploreSession.setState({
    center: DEFAULT_MAP_CENTER,
    cafes: [],
    placeName: '',
    command: null,
  });
});
afterEach(() => jest.useRealTimers());

test('an anonymous map shows actual SDK cafes without inventing prices and opens the selected cafe', async () => {
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <MapScreen {...props<React.ComponentProps<typeof MapScreen>>(nav)} />,
    );
  });
  const document = tree!.root.findAll(
    node => typeof node.props.source?.html === 'string',
  )[0];
  await act(() => {
    document.props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } });
    document.props.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          type: 'places',
          places: [
            {
              id: '42',
              name: 'SDK가 조회한 카페',
              address: '조회한 주소',
              latitude: 37.5,
              longitude: 127,
              distance: 150,
            },
          ],
        }),
      },
    });
  });
  expect(useKakaoSettingsStore.getState().settings.kakaoNativeAppKey).toBe('');
  expect(
    tree!.root.findAll(node => node.props.children === '가격 미등록').length,
  ).toBeGreaterThan(0);
  await act(() => byId(tree!, 'cafe-42').props.onPress());
  expect(nav.navigate).toHaveBeenCalledWith(
    'CafeDetail',
    expect.objectContaining({
      cafeId: '42',
      cafe: expect.objectContaining({
        name: 'SDK가 조회한 카페',
        latitude: 37.5,
      }),
    }),
  );
  await act(() => byLabel(tree!, '3천원 이하').props.onPress());
  expect(byId(tree!, 'cafe-42')).toBeUndefined();
  await act(() => tree!.unmount());
});

test('place submission sends a search command to the existing Map instead of adding another Map', async () => {
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <PlaceSearchScreen
        {...props<React.ComponentProps<typeof PlaceSearchScreen>>(nav)}
      />,
    );
  });
  await act(() =>
    tree!.root.findByType(TextInput).props.onChangeText('행신역'),
  );
  await act(() => tree!.root.findByType(TextInput).props.onSubmitEditing());
  expect(useExploreSession.getState().command).toMatchObject({
    type: 'search',
    query: '행신역',
  });
  expect(nav.popTo).toHaveBeenCalledWith('Map');
  expect(nav.navigate).not.toHaveBeenCalled();
  await act(() => tree!.unmount());
});



test('location permission uses the device result to move the existing map', async () => {
  mockRequestLocation.mockResolvedValueOnce({
    latitude: 37.6123,
    longitude: 126.8345,
  });
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <LocationPermissionScreen
        {...props<React.ComponentProps<typeof LocationPermissionScreen>>(nav)}
      />,
    );
  });
  await act(async () => {
    await byLabel(tree!, '위치 권한 허용하기').props.onPress();
  });
  expect(useExploreSession.getState().command).toMatchObject({
    type: 'center',
    coordinate: { latitude: 37.6123, longitude: 126.8345 },
    currentLocation: true,
  });
  expect(nav.popTo).toHaveBeenCalledWith('Map');
  await act(() => tree!.unmount());
});

test('voice search uses the recognized device text as the existing map command', async () => {
  mockRecognizeSpeech.mockResolvedValueOnce('행신역');
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <MapScreen {...props<React.ComponentProps<typeof MapScreen>>(nav)} />,
    );
  });
  const microphone = tree!.root.findAll(
    node =>
      node.props.accessibilityLabel === '음성으로 장소 검색' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(async () => {
    await microphone.props.onPress();
  });
  expect(useExploreSession.getState().command).toMatchObject({
    type: 'search',
    query: '행신역',
  });
  expect(nav.navigate).not.toHaveBeenCalled();
  await act(() => tree!.unmount());
});

test('a cafe with no registered menus never shows the Figma sample prices and can open real directions', async () => {
  const cafe = {
    id: '42',
    name: 'SDK가 조회한 카페',
    address: '조회한 주소',
    latitude: 37.5,
    longitude: 127,
  };
  const openUrl = jest
    .spyOn(Linking, 'openURL')
    .mockResolvedValueOnce(undefined);
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(() => {
      tree = Renderer.create(
        <CafeDetailScreen
          {...props<React.ComponentProps<typeof CafeDetailScreen>>(nav, {
            cafeId: cafe.id,
            cafe,
          })}
        />,
      );
    });
    expect(
      tree!.root.findAll(
        node => node.props.children === '등록된 메뉴 가격이 없습니다.',
      ).length,
    ).toBeGreaterThan(0);
    expect(JSON.stringify(tree!.toJSON())).not.toContain('2,000원');
    await act(async () => {
      await byLabel(tree!, '경유 길찾기').props.onPress();
    });
    expect(openUrl).toHaveBeenCalledWith(
      `https://map.kakao.com/link/to/${encodeURIComponent(cafe.name)},37.5,127`,
    );
    await act(() => byLabel(tree!, '리뷰 쓰기').props.onPress());
    expect(nav.navigate).toHaveBeenCalledWith('ReviewWrite', { cafeId: '42' });
  } finally {
    await act(() => tree!.unmount());
    openUrl.mockRestore();
  }
});

test('comparison computes its average from returned prices instead of the design example', async () => {
  mockResources['/api/menus/compare'] = {
    menuName: '아메리카노',
    average: 3500,
    min: 2200,
    max: 4800,
    items: [
      {
        cafeId: '1',
        cafeName: '확인된 카페 1',
        price: 2200,
        size: 'Large',
        temperature: 'ICE',
        distance: 100,
      },
      {
        cafeId: '2',
        cafeName: '확인된 카페 2',
        price: 4800,
        size: 'Large',
        temperature: 'ICE',
        distance: 200,
      },
    ],
  };
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <CompareScreen
        {...props<React.ComponentProps<typeof CompareScreen>>(nav, {
          menu: '아메리카노',
        })}
      />,
    );
  });
  const average = tree!.root.findAll(
    node => node.props.testID === 'comparison-average',
  )[0];
  expect(average.props.children).toBe('3,500원');
  expect(JSON.stringify(tree!.toJSON())).not.toContain('2,871원');
  await act(() => tree!.unmount());
});

test('comparison sorts API cafes by their current ratings without a map cache', async () => {
  mockResources['/api/menus/compare'] = {
    menuName: '아메리카노',
    average: 3000,
    min: 2000,
    max: 4000,
    items: [
      {
        cafeId: 'lower-rated',
        cafeName: '낮은 평점 카페',
        price: 2000,
        size: 'Large',
        temperature: 'ICE',
        distance: 100,
        rating: 3.2,
      },
      {
        cafeId: 'higher-rated',
        cafeName: '높은 평점 카페',
        price: 4000,
        size: 'Large',
        temperature: 'ICE',
        distance: 200,
        rating: 4.8,
      },
    ],
  };
  const nav = navigation();
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(() => {
      tree = Renderer.create(
        <CompareScreen
          {...props<React.ComponentProps<typeof CompareScreen>>(nav, {
            menu: '아메리카노',
          })}
        />,
      );
    });
    await act(() => byLabel(tree!, '평점순').props.onPress());
    const cafeLabels = [
      ...new Set(
        tree!.root
          .findAll(node =>
            node.props.accessibilityLabel?.endsWith(' 상세'),
          )
          .map(node => node.props.accessibilityLabel),
      ),
    ];
    expect(cafeLabels).toEqual([
      '높은 평점 카페 4,000원 상세',
      '낮은 평점 카페 2,000원 상세',
    ]);
  } finally {
    await act(() => tree!.unmount());
  }
});

test('cafe details retain the explored distance after fresh server data arrives', async () => {
  const cafe = {
    id: '42',
    name: '지도에서 본 카페',
    address: '지도 주소',
    latitude: 37.5,
    longitude: 127,
    distance: 180,
  };
  const nav = navigation();
  const screenProps = props<React.ComponentProps<typeof CafeDetailScreen>>(
    nav,
    { cafeId: cafe.id, cafe },
  );
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(() => {
      tree = Renderer.create(<CafeDetailScreen {...screenProps} />);
    });
    expect(JSON.stringify(tree!.toJSON())).toContain('180m');
    mockResources['/api/cafes/42'] = {
      id: '42',
      name: '갱신된 카페명',
      address: '갱신된 주소',
      latitude: 37.5,
      longitude: 127,
      rating: 4.6,
      reviewCount: 12,
      tags: [],
      verified: true,
      favorite: false,
      menus: [],
    };
    await act(() => tree!.update(<CafeDetailScreen {...screenProps} />));
    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain('갱신된 카페명');
    expect(rendered).toContain('180m');
  } finally {
    await act(() => tree!.unmount());
  }
});
