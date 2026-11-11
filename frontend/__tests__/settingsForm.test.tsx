import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { apiFetch } from '../src/api/client';
import { useConfigStore } from '../src/store/configStore';
import { useKakaoSettingsStore } from '../src/store/kakaoSettingsStore';
import { useSessionStore } from '../src/store/sessionStore';
import SettingsScreen from '../src/screens/settings/SettingsScreen';

jest.mock('../src/api/client', () => ({
  ...jest.requireActual('../src/api/client'),
  apiFetch: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const savedSettings = {
  kakaoNativeAppKey: 'stored-native-key',
  kakaoRestApiKey: 'stored-rest-key',
  kakaoMapJsKey: 'stored-map-key',
  kakaoRedirectUri: 'https://example.com/callback',
};
const serverUrl = 'https://service.example';
let tree: Renderer.ReactTestRenderer;

const renderSettings = async () => {
  const navigate = jest.fn();
  const props = { navigation: { navigate, goBack: jest.fn() } } as unknown as
    React.ComponentProps<typeof SettingsScreen>;
  await act(() => {
    tree = Renderer.create(<SettingsScreen {...props} />);
  });
  return navigate;
};
const button = (label: string) => tree.root.findAll(
  node => node.props.label === label && typeof node.props.onPress === 'function',
)[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiFetch).mockResolvedValue(null);
  useConfigStore.setState({ backendUrl: serverUrl, hydrated: true });
  useKakaoSettingsStore.getState().loadSettings(savedSettings);
  useSessionStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    hydrated: true,
  });
});
afterEach(async () => {
  await act(() => tree.unmount());
  jest.restoreAllMocks();
});

test('settings hides technical inputs and addresses while preserving stored configuration', async () => {
  const navigate = await renderSettings();

  expect(tree.root.findAll(node => typeof node.props.onChangeText === 'function')).toHaveLength(0);
  const rendered = JSON.stringify(tree.toJSON());
  for (const text of [...Object.values(savedSettings), serverUrl, 'https://localhost']) {
    expect(rendered).not.toContain(text);
  }
  expect(button('오픈소스 안내')).toBeDefined();
  await act(() => button('카카오 계정으로 로그인').props.onPress());
  expect(navigate).toHaveBeenCalledWith('Login');
  expect(useKakaoSettingsStore.getState().settings).toEqual(savedSettings);
  expect(useConfigStore.getState().backendUrl).toBe(serverUrl);
});

test('logout revokes the refresh token without a Bearer access token', async () => {
  useSessionStore.setState({
    user: { id: 'u1', nickname: '회원', profileImageUrl: null, role: 'USER' },
    accessToken: 'expired-access',
    refreshToken: 'refresh-to-revoke',
  });
  const alert = jest.spyOn(Alert, 'alert');
  await renderSettings();
  await act(() => button('회원 · 로그아웃').props.onPress());
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
