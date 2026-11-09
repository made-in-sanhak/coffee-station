import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import KakaoMapView from '../src/components/map/KakaoMapView';
import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import { KAKAO_MAP_BASE_URL } from '../src/components/map/mapConfig';

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

const props = {
  initialCenter: { latitude: 37.5665, longitude: 126.978 },
  markers: [],
  selectedId: null,
  onMarkerPress: jest.fn(),
  onMapPress: jest.fn(),
  onCenterChange: jest.fn(),
};

test('saving a new map key reloads the map after an earlier SDK error', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'first-key' });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<KakaoMapView {...props} />);
  });
  const document = () =>
    tree!.root.findAll(node => typeof node.props.source?.html === 'string')[0];
  expect(document().props.source.html).toContain('appkey=first-key');
  await act(() => {
    document().props.onMessage({ nativeEvent: { data: '{"type":"error"}' } });
  });
  expect(document()).toBeUndefined();
  await act(() => {
    useKakaoSettingsStore
      .getState()
      .loadSettings({ kakaoMapJsKey: 'second-key' });
  });
  expect(document()?.props.source.html).toContain('appkey=second-key');
  await act(() => {
    tree!.unmount();
  });
});

test('a JavaScript key loads an HTTPS map without any login keys', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-only' });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<KakaoMapView {...props} />);
  });
  const document = tree!.root.findAll(
    node => typeof node.props.source?.html === 'string',
  )[0];
  expect(document.props.source.baseUrl).toBe(KAKAO_MAP_BASE_URL);
  expect(document.props.source.html).toContain('appkey=map-only');
  await act(() => tree!.unmount());
});

test('the loading message disappears only when the map is ready', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-key' });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<KakaoMapView {...props} />);
  });
  expect(
    tree!.root.findAllByProps({ testID: 'map-loading' }).length,
  ).toBeGreaterThan(0);
  const document = tree!.root.findAll(
    node => typeof node.props.source?.html === 'string',
  )[0];
  await act(() => {
    document.props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } });
  });
  expect(tree!.root.findAllByProps({ testID: 'map-loading' })).toHaveLength(0);
  await act(() => tree!.unmount());
});

test('the same saved key can retry a failed map', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'same-key' });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<KakaoMapView {...props} />);
  });
  const documents = () =>
    tree!.root.findAll(node => typeof node.props.source?.html === 'string');
  const original = documents()[0];
  await act(() => {
    original.props.onMessage({
      nativeEvent: { data: '{"type":"error","reason":"sdk-load"}' },
    });
  });
  expect(documents()).toHaveLength(0);
  const retry = tree!.root.findAll(
    node =>
      node.props.testID === 'map-retry' &&
      typeof node.props.onPress === 'function',
  )[0];
  expect(retry).toBeDefined();
  await act(() => retry.props.onPress());
  expect(documents()[0].props.source.html).toContain('appkey=same-key');
  expect(documents()[0]).not.toBe(original);
  await act(() => tree!.unmount());
});

test('malformed bridge messages and non-finite map coordinates are ignored', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-key' });
  const onCenterChange = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <KakaoMapView {...props} onCenterChange={onCenterChange} />,
    );
  });
  const document = tree!.root.findAll(
    node => typeof node.props.source?.html === 'string',
  )[0];
  const receive = (data: string) =>
    document.props.onMessage({ nativeEvent: { data } });
  expect(() => receive('{broken')).not.toThrow();
  expect(() => receive('null')).not.toThrow();
  await act(() => {
    receive('{"type":"ready"}');
    receive('{"type":"idle","latitude":1e999,"longitude":126.978}');
    receive('{"type":"idle","latitude":"37.5","longitude":126.978}');
    receive('{"type":"idle","latitude":91,"longitude":126.978}');
  });
  expect(onCenterChange).not.toHaveBeenCalled();
  await act(() => receive('{"type":"idle","latitude":37.5,"longitude":126.9}'));
  expect(onCenterChange).toHaveBeenCalledWith({
    latitude: 37.5,
    longitude: 126.9,
  });
  await act(() => tree!.unmount());
});

test('a map that never reports ready stops loading and offers retry', async () => {
  jest.useFakeTimers();
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-key' });
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(() => {
      tree = Renderer.create(<KakaoMapView {...props} />);
    });
    await act(() => jest.advanceTimersByTime(16000));
    expect(tree!.root.findAllByProps({ testID: 'map-loading' })).toHaveLength(
      0,
    );
    expect(
      tree!.root.findAllByProps({ testID: 'map-retry' }).length,
    ).toBeGreaterThan(0);
    expect(
      tree!.root.findAll(node => typeof node.props.source?.html === 'string'),
    ).toHaveLength(0);
  } finally {
    await act(() => tree!.unmount());
    jest.useRealTimers();
  }
});

test('actual nearby places reach the native screen while malformed coordinates are dropped', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-key' });
  const onPlaces = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<KakaoMapView {...props} onPlaces={onPlaces} />);
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
              name: '조회된 카페',
              address: '서울시',
              latitude: 37.5,
              longitude: 127,
            },
            {
              id: 'bad',
              name: '잘못된 좌표',
              address: '',
              latitude: 123,
              longitude: 127,
            },
          ],
        }),
      },
    });
  });
  expect(onPlaces).toHaveBeenCalledWith([
    {
      id: '42',
      name: '조회된 카페',
      address: '서울시',
      latitude: 37.5,
      longitude: 127,
    },
  ]);
  await act(() => tree!.unmount());
});

test('a provider string place identifier opens the matching marker', async () => {
  useKakaoSettingsStore.getState().loadSettings({ kakaoMapJsKey: 'map-key' });
  const onMarkerPress = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <KakaoMapView {...props} onMarkerPress={onMarkerPress} />,
    );
  });
  const document = tree!.root.findAll(
    node => typeof node.props.source?.html === 'string',
  )[0];
  await act(() => {
    document.props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } });
    document.props.onMessage({
      nativeEvent: { data: '{"type":"markerPress","id":"42"}' },
    });
  });
  expect(onMarkerPress).toHaveBeenCalledWith('42');
  await act(() => tree!.unmount());
});
