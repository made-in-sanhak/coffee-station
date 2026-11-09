import { defaultKakaoSettings } from '../src/utils/kakaoSettingsDefaults';
import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import {
  createKakaoStorageBridge,
  KAKAO_STORAGE_HTML,
  setKakaoSettingsWriter,
} from '../src/storage/kakaoSettingsStorage';
const vm = require('node:vm');

// Run the actual offline WebView document with real in-memory DOM storage.
function openStorage(disk: Map<string, string>, failWrite = false) {
  let receive: (message: string) => void = () => {};
  const pending: string[] = [];
  const context = vm.createContext({
    window: {
      ReactNativeWebView: {
        postMessage: (message: string) => pending.push(message),
      },
    },
    localStorage: {
      getItem: (key: string) => disk.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (failWrite) throw new Error('disk full');
        disk.set(key, value);
      },
    },
  });
  const bridge = createKakaoStorageBridge(
    script => {
      vm.runInContext(script, context);
      while (pending.length) receive(pending.shift()!);
    },
    value => useKakaoSettingsStore.getState().loadSettings(value),
    message => useKakaoSettingsStore.getState().storageFailed(message),
  );
  receive = bridge.onMessage;
  const script = KAKAO_STORAGE_HTML.match(/<script>([\s\S]*?)<\/script>/)![1];
  vm.runInContext(script, context);
  while (pending.length) receive(pending.shift()!);
  const disconnect = setKakaoSettingsWriter(bridge.write);
  return () => {
    disconnect();
    bridge.dispose();
  };
}

beforeEach(() => {
  useKakaoSettingsStore.setState({
    settings: {
      kakaoNativeAppKey: '',
      kakaoRestApiKey: '',
      kakaoMapJsKey: '',
      kakaoRedirectUri: 'http://localhost:8080/auth/kakao/callback',
    },
    status: 'loading',
    error: null,
  });
});

test('saved map settings survive storage restart', async () => {
  const disk = new Map<string, string>();
  const close = openStorage(disk);
  await useKakaoSettingsStore.getState().saveSettings({
    kakaoNativeAppKey: ' native-key ',
    kakaoRestApiKey: ' rest-key ',
    kakaoMapJsKey: ' map-key ',
    kakaoRedirectUri: ' https://coffee.test/callback ',
  });
  close();
  useKakaoSettingsStore.setState({
    settings: {
      kakaoNativeAppKey: '',
      kakaoRestApiKey: '',
      kakaoMapJsKey: '',
      kakaoRedirectUri: '',
    },
    status: 'loading',
  });
  const closeReload = openStorage(disk);
  expect(useKakaoSettingsStore.getState().status).toBe('ready');
  expect(useKakaoSettingsStore.getState().settings).toEqual({
    kakaoNativeAppKey: 'native-key',
    kakaoRestApiKey: 'rest-key',
    kakaoMapJsKey: 'map-key',
    kakaoRedirectUri: 'https://coffee.test/callback',
  });
  closeReload();
});

test('clearing saved keys restores environment defaults', async () => {
  const disk = new Map<string, string>();
  const close = openStorage(disk);
  await useKakaoSettingsStore.getState().saveSettings({
    kakaoNativeAppKey: 'first-native',
    kakaoRestApiKey: 'first',
    kakaoMapJsKey: 'map',
    kakaoRedirectUri: 'https://coffee.test/callback',
  });
  await useKakaoSettingsStore.getState().saveSettings({
    kakaoNativeAppKey: '   ',
    kakaoRestApiKey: '   ',
    kakaoMapJsKey: '',
    kakaoRedirectUri: 'https://coffee.test/callback',
  });
  close();
  const closeReload = openStorage(disk);
  expect(useKakaoSettingsStore.getState().settings.kakaoNativeAppKey).toBe(defaultKakaoSettings.kakaoNativeAppKey);
  expect(useKakaoSettingsStore.getState().settings.kakaoRestApiKey).toBe(defaultKakaoSettings.kakaoRestApiKey);
  expect(useKakaoSettingsStore.getState().settings.kakaoMapJsKey).toBe(defaultKakaoSettings.kakaoMapJsKey);
  closeReload();
});

test('failed disk writes do not apply unsaved keys', async () => {
  const close = openStorage(new Map(), true);
  const before = useKakaoSettingsStore.getState().settings;
  await expect(
    useKakaoSettingsStore.getState().saveSettings({
      kakaoNativeAppKey: 'unsaved-native',
      kakaoRestApiKey: 'unsaved',
      kakaoMapJsKey: '',
      kakaoRedirectUri: 'https://coffee.test/callback',
    }),
  ).rejects.toThrow();
  expect(useKakaoSettingsStore.getState().settings).toBe(before);
  close();
});

test('malformed stored data does not block startup', () => {
  for (const stored of ['{broken', '42', '{"kakaoRestApiKey":42}']) {
    const close = openStorage(new Map([['coffee.kakao.settings.v1', stored]]));
    expect(useKakaoSettingsStore.getState().status).toBe('ready');
    expect(
      typeof useKakaoSettingsStore.getState().settings.kakaoRestApiKey,
    ).toBe('string');
    close();
  }
});

test('saving before hydration cannot overwrite pending stored settings', async () => {
  await expect(
    useKakaoSettingsStore.getState().saveSettings({
      kakaoNativeAppKey: 'early-native',
      kakaoRestApiKey: 'early',
      kakaoMapJsKey: '',
      kakaoRedirectUri: '',
    }),
  ).rejects.toThrow();
  expect(useKakaoSettingsStore.getState().status).toBe('loading');
});

test('invalid redirect addresses fail before saving', async () => {
  const close = openStorage(new Map());
  await expect(
    useKakaoSettingsStore.getState().saveSettings({
      kakaoNativeAppKey: '',
      kakaoRestApiKey: 'rest',
      kakaoMapJsKey: '',
      kakaoRedirectUri: 'ftp://coffee.test/callback',
    }),
  ).rejects.toThrow('Redirect URI');
  close();
});

test('legacy REST settings stay distinct from the native app key', () => {
  const close = openStorage(
    new Map([
      [
        'coffee.kakao.settings.v1',
        JSON.stringify({
          kakaoRestApiKey: 'legacy-rest-key',
          kakaoMapJsKey: 'legacy-map-key',
          kakaoRedirectUri: 'https://coffee.test/callback',
        }),
      ],
    ]),
  );
  expect(useKakaoSettingsStore.getState().settings.kakaoNativeAppKey).toBe(defaultKakaoSettings.kakaoNativeAppKey);
  expect(useKakaoSettingsStore.getState().settings.kakaoRestApiKey).toBe(
    'legacy-rest-key',
  );
  expect(useKakaoSettingsStore.getState().settings.kakaoMapJsKey).toBe(
    'legacy-map-key',
  );
  close();
});
