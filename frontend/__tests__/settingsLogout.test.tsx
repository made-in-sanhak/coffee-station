import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import SettingsScreen from '../src/screens/settings/SettingsScreen';
import { API_BASE_URL } from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { useConfigStore } from '../src/store/configStore';
import { useSessionStore } from '../src/store/sessionStore';
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const previousFetch = globalThis.fetch;
let tree: Renderer.ReactTestRenderer | undefined;
const session = {
  accessToken: 'expired-service-access',
  refreshToken: 'service-refresh',
  user: { id: 42, nickname: '회원', profileImageUrl: null },
};
async function confirmLogout(label: string, confirmLabel: string) {
  const alert = jest.spyOn(Alert, 'alert');
  await act(async () => {
    tree = Renderer.create(
      <SettingsScreen
        {...({
          navigation: { navigate: jest.fn(), goBack: jest.fn() },
        } as unknown as React.ComponentProps<typeof SettingsScreen>)}
      />,
    );
  });
  const button = tree!.root.findAll(
    n => n.props.label === label && typeof n.props.onPress === 'function',
  )[0];
  await act(() => button.props.onPress());
  const confirm = alert.mock.calls[0][2]?.find(
    item => item.text === confirmLabel,
  );
  await act(async () => {
    await confirm!.onPress!();
  });
}
beforeEach(() => {
  useAuthStore.getState().logout();
  useConfigStore.setState({ backendUrl: '', hydrated: true });
  globalThis.fetch = jest.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({ success: true, data: null, message: null }),
      } as Response),
  );
});
afterEach(async () => {
  await act(async () => {
    tree?.unmount();
  });
  tree = undefined;
  useAuthStore.getState().logout();
  globalThis.fetch = previousFetch;
  jest.restoreAllMocks();
});
test('default server service logout sends refresh revocation without expired access credentials', async () => {
  useAuthStore.getState().setSession(session);
  await confirmLogout('회원 · 로그아웃', '로그아웃');
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = jest.mocked(globalThis.fetch).mock.calls[0];
  expect(url).toBe(API_BASE_URL + '/api/auth/logout');
  expect(init?.method).toBe('POST');
  expect(JSON.parse(String(init?.body))).toEqual({
    refreshToken: session.refreshToken,
  });
  expect(new Headers(init?.headers).get('Authorization')).toBeNull();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useSessionStore.getState().refreshToken).toBeNull();
});
test('ending a mock preview does not send a service logout request', async () => {
  useAuthStore
    .getState()
    .setSession({
      ...session,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  await confirmLogout('미리보기 종료', '종료');
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(useAuthStore.getState().accessToken).toBeNull();
});
