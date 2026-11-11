import { buildKakaoMapHtml } from '../src/components/map/kakaoMapHtml';

const vm = require('node:vm');

function openDocument(
  mode:
    | 'success'
    | 'script-error'
    | 'stalled'
    | 'map-error'
    | 'deferred-search',
  appKey = 'map-only',
) {
  const messages: Record<string, unknown>[] = [];
  const scripts: { src?: string; onload?: () => void; onerror?: () => void }[] =
    [];
  const moved: unknown[] = [];
  let completeSearch: (() => void) | undefined;
  const map = {
    getCenter: () => ({ getLat: () => 37.5, getLng: () => 127 }),
    setCenter: (coordinate: unknown) => moved.push(coordinate),
    panTo: (coordinate: unknown) => moved.push(coordinate),
    getProjection: () => ({ pointFromCoords: () => ({ x: 195, y: 300 }) }),
  };
  const place = {
    id: '42',
    place_name: '실제 조회 카페',
    address_name: '서울시',
    x: '127',
    y: '37.5',
    distance: '250',
    phone: '02-000-0000',
    place_url: 'https://place.map.kakao.com/42',
  };
  const kakao = {
    maps: {
      load: (complete: () => void) => {
        if (mode !== 'stalled') complete();
      },
      Map: function () {
        if (mode === 'map-error') throw new Error('map creation failed');
        return map;
      },
      LatLng: function (
        this: { latitude: number; longitude: number },
        latitude: number,
        longitude: number,
      ) {
        this.latitude = latitude;
        this.longitude = longitude;
      },
      event: { addListener: () => {} },
      services: {
        Places: function (this: {
          keywordSearch?: unknown;
          categorySearch?: unknown;
        }) {
          this.keywordSearch = (
            _query: string,
            complete: (places: unknown[], status: string) => void,
          ) => {
            if (mode === 'deferred-search')
              completeSearch = () => complete([place], 'OK');
            else complete([place], 'OK');
          };
          this.categorySearch = (
            _category: string,
            complete: (places: unknown[], status: string) => void,
          ) => complete([place], 'OK');
        },
        Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT' },
        SortBy: { DISTANCE: 'DISTANCE' },
      },
    },
  };
  const window = {
    kakao: mode === 'script-error' ? undefined : kakao,
    ReactNativeWebView: {
      postMessage: (value: string) => messages.push(JSON.parse(value)),
    },
  };
  const context = vm.createContext({
    window,
    kakao,
    setTimeout,
    clearTimeout,
    document: {
      getElementById: () => ({}),
      createElement: () => ({}),
      head: {
        appendChild: (script: (typeof scripts)[number]) => scripts.push(script),
      },
    },
  });
  const html = buildKakaoMapHtml(appKey, {
    latitude: 37.5,
    longitude: 127,
  });
  for (const match of html.matchAll(
    /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g,
  )) {
    if (match[1].trim()) vm.runInContext(match[1], context);
  }
  if (mode === 'script-error') scripts[0]?.onerror?.();
  else scripts[0]?.onload?.();
  return {
    messages,
    scripts,
    context,
    moved,
    resolveSearch: () => completeSearch?.(),
  };
}

afterEach(() => jest.useRealTimers());

test('the actual map document reports SDK download failure', () => {
  jest.useFakeTimers();
  const { messages } = openDocument('script-error');
  expect(messages).toContainEqual({ type: 'error', reason: 'sdk-load' });
});

test('the actual map document times out when SDK callback never arrives', () => {
  jest.useFakeTimers();
  const { messages } = openDocument('stalled');
  jest.advanceTimersByTime(16000);
  expect(messages).toContainEqual({ type: 'error', reason: 'sdk-timeout' });
  expect(messages.some(message => message.type === 'ready')).toBe(false);
});

test('the actual map document reports map construction failure', () => {
  jest.useFakeTimers();
  expect(() => {
    const { messages } = openDocument('map-error');
    expect(messages).toContainEqual({ type: 'error', reason: 'map-create' });
  }).not.toThrow();
});

test('a ready map reports ready once and clears the failure timeout', () => {
  jest.useFakeTimers();
  const { messages } = openDocument('success');
  jest.advanceTimersByTime(16000);
  expect(messages).toEqual([{ type: 'ready' }]);
});

test('quotes in a mistyped key remain SDK URL data without breaking document JavaScript', () => {
  jest.useFakeTimers();
  const appKey = `bad'key"<&`;
  const { messages, scripts } = openDocument('success', appKey);
  expect(messages).toEqual([{ type: 'ready' }]);
  expect(scripts[0].src).toBe(
    `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false&libraries=services`,
  );
  expect(new URL(scripts[0].src!).searchParams.get('appkey')).toBe(appKey);
});

test('a place search moves the existing map and returns the actual SDK place', () => {
  jest.useFakeTimers();
  const { messages, context, moved } = openDocument('success');
  vm.runInContext('window.coffeeMap.search("행신역");', context);
  expect(moved).toContainEqual({ latitude: 37.5, longitude: 127 });
  expect(messages).toContainEqual(
    expect.objectContaining({
      type: 'placeSearch',
      place: expect.objectContaining({
        id: '42',
        name: '실제 조회 카페',
        latitude: 37.5,
        longitude: 127,
      }),
    }),
  );
});

test('nearby cafe discovery passes through SDK data without invented menu prices', () => {
  jest.useFakeTimers();
  const { messages, context } = openDocument('success');
  vm.runInContext('window.coffeeMap.setBrowseNearby(true);', context);
  const result = messages.find(message => message.type === 'places');
  expect(result).toEqual({
    type: 'places',
    places: [
      {
        id: '42',
        name: '실제 조회 카페',
        address: '서울시',
        latitude: 37.5,
        longitude: 127,
        distance: 250,
        phone: '02-000-0000',
        placeUrl: 'https://place.map.kakao.com/42',
      },
    ],
  });
  expect(JSON.stringify(result)).not.toContain('price');
});

test('returning to current location ignores an earlier delayed search response', () => {
  jest.useFakeTimers();
  const { messages, context, moved, resolveSearch } =
    openDocument('deferred-search');
  vm.runInContext(
    'window.coffeeMap.search("행신역"); window.coffeeMap.setCenter({latitude:37.6,longitude:126.8},true);',
    context,
  );
  resolveSearch();
  expect(moved[moved.length - 1]).toEqual({ latitude: 37.6, longitude: 126.8 });
  expect(messages.some(message => message.type === 'placeSearch')).toBe(false);
});
