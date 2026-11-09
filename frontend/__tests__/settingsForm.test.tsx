import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { native } from '../src/app/native';
import { apiFetch } from '../src/api/client';
import { useConfigStore } from '../src/store/configStore';
import { useSessionStore } from '../src/store/sessionStore';
import SettingsScreen from '../src/screens/settings/SettingsScreen';
import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import { setKakaoSettingsWriter } from '../src/storage/kakaoSettingsStorage';

jest.mock('../src/app/native', () => ({
  native: { secureSet: jest.fn(), secureRemove: jest.fn() },
}));
jest.mock('../src/api/client', () => ({ ...jest.requireActual('../src/api/client'), apiFetch: jest.fn() }));
jest.mock('../src/utils/kakaoSettingsDefaults', () => ({ defaultKakaoSettings: { kakaoNativeAppKey: '', kakaoRestApiKey: '', kakaoMapJsKey: '', kakaoRedirectUri: '' } }));
let trees: Renderer.ReactTestRenderer[];

const savedSettings = {
  kakaoNativeAppKey: 'stored-native-key',
  kakaoRestApiKey: 'stored-rest-key',
  kakaoMapJsKey: 'stored-map-key',
  kakaoRedirectUri: 'https://example.com/callback',
};
const writer = jest.fn();
let removeWriter: () => void;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const renderForm = async () => {
  const goBack = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  const props = { navigation: { goBack } } as unknown as React.ComponentProps<
    typeof SettingsScreen
  >;
  await act(() => {
    tree = Renderer.create(<SettingsScreen {...props} />);
  });
  trees.push(tree!);
  return { tree: tree!, goBack };
};
const control = (tree: Renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll(node => node.props.testID === id)[0];

beforeEach(() => {
  trees = [];
  jest.clearAllMocks();
  jest.mocked(native.secureSet).mockResolvedValue(undefined);
  jest.mocked(native.secureRemove).mockResolvedValue(undefined);
  jest.mocked(apiFetch).mockResolvedValue(null);
  useConfigStore.setState({
    backendUrl: 'https://service.example',
    hydrated: true,
  });
  useSessionStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    hydrated: true,
  });
  writer.mockReset();
  writer.mockResolvedValue(undefined);
  removeWriter = setKakaoSettingsWriter(writer);
  useKakaoSettingsStore.getState().loadSettings(savedSettings);
});
afterEach(async () => {
  await act(() => {
    trees.forEach(tree => tree.unmount());
  });
  removeWriter();
  jest.restoreAllMocks();
});

test('editing and canceling leaves stored settings untouched', async () => {
  const { tree, goBack } = await renderForm();
  expect(control(tree, 'settings-rest-key').props.value).toBe(
    'stored-rest-key',
  );
  await act(() =>
    control(tree, 'settings-rest-key').props.onChangeText('edited-rest-key'),
  );
  await act(() => control(tree, 'settings-cancel').props.onPress());
  expect(writer).not.toHaveBeenCalled();
  expect(useKakaoSettingsStore.getState().settings).toEqual(savedSettings);
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(() => tree.unmount());
});

test('save waits for storage success before applying settings and closing', async () => {
  let acknowledge!: () => void;
  writer.mockReturnValue(
    new Promise<void>(resolve => {
      acknowledge = resolve;
    }),
  );
  const { tree, goBack } = await renderForm();
  await act(() =>
    control(tree, 'settings-map-key').props.onChangeText('new-map-key'),
  );
  let pending: Promise<void>;
  await act(() => {
    pending = control(tree, 'settings-save').props.onPress();
  });
  expect(writer).toHaveBeenCalledWith({
    kakaoNativeAppKey: 'stored-native-key',
    kakaoRestApiKey: 'stored-rest-key',
    kakaoMapJsKey: 'new-map-key',
    kakaoRedirectUri: 'https://example.com/callback',
  });
  expect(useKakaoSettingsStore.getState().settings).toEqual(savedSettings);
  expect(goBack).not.toHaveBeenCalled();
  await act(async () => {
    acknowledge();
    await pending;
  });
  expect(useKakaoSettingsStore.getState().settings.kakaoMapJsKey).toBe(
    'new-map-key',
  );
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(() => tree.unmount());
});

test('save error keeps edits visible without changing active settings', async () => {
  writer.mockRejectedValue(new Error('저장 공간에 기록하지 못했습니다.'));
  const { tree, goBack } = await renderForm();
  await act(() =>
    control(tree, 'settings-rest-key').props.onChangeText('retry-key'),
  );
  await act(async () => control(tree, 'settings-save').props.onPress());
  expect(goBack).not.toHaveBeenCalled();
  expect(useKakaoSettingsStore.getState().settings).toEqual(savedSettings);
  expect(control(tree, 'settings-rest-key').props.value).toBe('retry-key');
  expect(control(tree, 'settings-error').props.children).toBe(
    '저장 공간에 기록하지 못했습니다.',
  );
  await act(() => tree.unmount());
});

test('settings opened during hydration disables edits and then uses persisted values', async () => {
  useKakaoSettingsStore.setState({
    settings: {
      kakaoNativeAppKey: '',
      kakaoRestApiKey: '',
      kakaoMapJsKey: '',
      kakaoRedirectUri: '',
    },
    status: 'loading',
    error: null,
  });
  const { tree, goBack } = await renderForm();
  expect(control(tree, 'settings-rest-key').props.editable).toBe(false);
  expect(control(tree, 'settings-save').props.disabled).toBe(true);
  await act(() => useKakaoSettingsStore.getState().loadSettings(savedSettings));
  expect(control(tree, 'settings-rest-key').props.value).toBe(
    'stored-rest-key',
  );
  expect(control(tree, 'settings-rest-key').props.editable).toBe(true);
  await act(async () => control(tree, 'settings-save').props.onPress());
  expect(writer).toHaveBeenCalledWith(savedSettings);
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(() => tree.unmount());
});

test.each(['loading', 'error'] as const)(
  'late hydration after startup error preserves saved keys when opened during %s',
  async initialStatus => {
    useKakaoSettingsStore.setState({
      settings: {
        kakaoNativeAppKey: '',
        kakaoRestApiKey: '',
        kakaoMapJsKey: '',
        kakaoRedirectUri: '',
      },
      status: 'loading',
      error: null,
    });
    if (initialStatus === 'error') {
      useKakaoSettingsStore
        .getState()
        .storageFailed('설정을 불러오지 못했습니다.');
    }
    const { tree, goBack } = await renderForm();
    if (initialStatus === 'loading') {
      await act(() =>
        useKakaoSettingsStore
          .getState()
          .storageFailed('설정을 불러오지 못했습니다.'),
      );
    }
    expect(control(tree, 'settings-rest-key').props.editable).toBe(false);
    expect(control(tree, 'settings-save').props.disabled).toBe(true);
    expect(control(tree, 'settings-error').props.children).toBe(
      '설정을 불러오지 못했습니다.',
    );
    await act(async () => control(tree, 'settings-save').props.onPress());
    expect(writer).not.toHaveBeenCalled();
    await act(() =>
      useKakaoSettingsStore.getState().loadSettings(savedSettings),
    );
    expect(control(tree, 'settings-rest-key').props.value).toBe(
      'stored-rest-key',
    );
    expect(control(tree, 'settings-rest-key').props.value).toBe(
      'stored-rest-key',
    );
    expect(control(tree, 'settings-map-key').props.value).toBe(
      'stored-map-key',
    );
    expect(control(tree, 'settings-rest-key').props.editable).toBe(true);
    await act(async () => control(tree, 'settings-save').props.onPress());
    expect(writer).toHaveBeenCalledWith(savedSettings);
    expect(goBack).toHaveBeenCalledTimes(1);
    await act(() => tree.unmount());
  },
);

test('map key is the first input and optional login keys persist independently', async () => {
  const { tree, goBack } = await renderForm();
  const inputs = tree.root.findAll(
    node =>
      typeof node.props.onChangeText === 'function' &&
      node.props.testID?.startsWith('settings-'),
  );
  expect(inputs[0].props.testID).toBe('settings-map-key');
  expect(control(tree, 'settings-rest-key').props.value).toBe(
    'stored-rest-key',
  );
  await act(() =>
    control(tree, 'settings-rest-key').props.onChangeText(' edited-rest-key '),
  );
  await act(async () => control(tree, 'settings-save').props.onPress());
  expect(writer).toHaveBeenCalledWith({
    kakaoNativeAppKey: 'stored-native-key',
    kakaoRestApiKey: 'edited-rest-key',
    kakaoMapJsKey: 'stored-map-key',
    kakaoRedirectUri: 'https://example.com/callback',
  });
  expect(useKakaoSettingsStore.getState().settings.kakaoRestApiKey).toBe(
    'edited-rest-key',
  );
  expect(goBack).toHaveBeenCalledTimes(1);
  await act(() => tree.unmount());
});

test('settings exposes map, service URL and REST login inputs', async () => {
  const { tree } = await renderForm();
  const inputIds = Array.from(
    new Set(
      tree.root
        .findAll(node => typeof node.props.onChangeText === 'function')
        .map(node => node.props.testID),
    ),
  );
  expect(inputIds).toEqual([
    'settings-map-key',
    'settings-server-url',
    'settings-rest-key',
  ]);
  await act(() => tree.unmount());
});

test('map-only settings save without a native or REST login key', async () => {
  useConfigStore.setState({ backendUrl: '' });
  useKakaoSettingsStore.getState().loadSettings({
    kakaoNativeAppKey: '',
    kakaoRestApiKey: '',
    kakaoMapJsKey: '',
    kakaoRedirectUri: '',
  });
  const { tree, goBack } = await renderForm();
  await act(() =>
    control(tree, 'settings-map-key').props.onChangeText('map-only-key'),
  );
  await act(async () => control(tree, 'settings-save').props.onPress());
  expect(writer).toHaveBeenCalledWith({
    kakaoNativeAppKey: '',
    kakaoRestApiKey: '',
    kakaoMapJsKey: 'map-only-key',
    kakaoRedirectUri: '',
  });
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(control(tree, 'settings-map-domain').props.children).toBe(
    'https://localhost',
  );
  await act(() => tree.unmount());
});

test('pending backend hydration prevents an empty draft from overwriting the saved server', async () => {
  useConfigStore.setState({ backendUrl: '', hydrated: false });
  const { tree } = await renderForm();
  expect(control(tree, 'settings-server-url').props.editable).toBe(false);
  expect(control(tree, 'settings-save').props.disabled).toBe(true);
  await act(async () => control(tree, 'settings-save').props.onPress());
  expect(writer).not.toHaveBeenCalled();
  await act(() =>
    useConfigStore.setState({
      backendUrl: 'https://restored.example',
      hydrated: true,
    }),
  );
  expect(control(tree, 'settings-server-url').props.value).toBe(
    'https://restored.example',
  );
  expect(control(tree, 'settings-save').props.disabled).toBe(false);
});

test('same-tick repeated save presses make one durable write', async () => {
  let acknowledge!: () => void;
  writer.mockReturnValue(
    new Promise<void>(resolve => {
      acknowledge = resolve;
    }),
  );
  const { tree, goBack } = await renderForm();
  const press = control(tree, 'settings-save').props.onPress;
  let first!: Promise<void>;
  await act(() => {
    first = press();
    press().catch(() => undefined);
  });
  expect(writer).toHaveBeenCalledTimes(1);
  await act(async () => {
    acknowledge();
    await first;
  });
  expect(goBack).toHaveBeenCalledTimes(1);
});

test('finishing a save after unmount does not pop another screen', async () => {
  let acknowledge!: () => void;
  writer.mockReturnValue(
    new Promise<void>(resolve => {
      acknowledge = resolve;
    }),
  );
  const { tree, goBack } = await renderForm();
  let saving!: Promise<void>;
  await act(() => {
    saving = control(tree, 'settings-save').props.onPress();
  });
  await act(() => tree.unmount());
  trees = [];
  await act(async () => {
    acknowledge();
    await saving;
  });
  expect(goBack).not.toHaveBeenCalled();
});

test('logout revokes the refresh token without a Bearer access token', async () => {
  useSessionStore.setState({
    user: { id: 'u1', nickname: '회원', profileImageUrl: null, role: 'USER' },
    accessToken: 'expired-access',
    refreshToken: 'refresh-to-revoke',
  });
  const alert = jest.spyOn(Alert, 'alert');
  const { tree } = await renderForm();
  const button = tree.root.findAll(
    node =>
      node.props.label === '회원 · 로그아웃' &&
      typeof node.props.onPress === 'function',
  )[0];
  await act(() => button.props.onPress());
  const confirm = alert.mock.calls[0][2]?.find(
    item => item.text === '로그아웃',
  );
  await act(async () => {
    await confirm!.onPress!();
  });
  expect(apiFetch).toHaveBeenCalledWith('/api/auth/logout', {
    method: 'POST',
    authentication: 'none',
    body: JSON.stringify({ refreshToken: 'refresh-to-revoke' }),
  });
  expect(useSessionStore.getState().accessToken).toBeNull();
  expect(useSessionStore.getState().refreshToken).toBeNull();
});
