import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from '../src/navigation/RootNavigator';
import type { RootStackParamList } from '../src/navigation/types';
import { useAuthStore } from '../src/store/authStore';
import { usePreferenceStore } from '../src/store/preferenceStore';
import { useSessionStore } from '../src/store/sessionStore';
import { queryClient } from '../src/app/queryClient';
import { env } from '../src/utils/env';

let mockStackMounts = 0;
jest.mock('@react-navigation/native-stack', () => {
  const ReactModule = require('react');
  const { createNavigatorFactory, useNavigationBuilder } = require('@react-navigation/native');
  const { StackRouter } = require('@react-navigation/routers');
  function TestStack(props: object) {
    const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, props);
    ReactModule.useEffect(() => { mockStackMounts++; }, []);
    return ReactModule.createElement(
      NavigationContent,
      null,
      descriptors[state.routes[state.index].key].render(),
    );
  }
  return { createNativeStackNavigator: createNavigatorFactory(TestStack) };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../src/screens/map/MapScreen', () => () => null);
jest.mock('../src/screens/community/CommunityScreen', () => () => null);
jest.mock('../src/screens/community/ReviewWriteScreen', () => () => null);

const preview = {
  accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token',
  user: { id: 1, nickname: 'fixture preview', profileImageUrl: null },
};
const service = {
  accessToken: 'fixture-service-access', refreshToken: 'fixture-service-refresh',
  user: { id: 42, nickname: 'fixture member', profileImageUrl: null },
};
const previousFetch = globalThis.fetch;
const originalMockMode = env.useMockApi;
const trees: Renderer.ReactTestRenderer[] = [];

async function mount() {
  const nav = createNavigationContainerRef<RootStackParamList>();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={nav}><RootNavigator /></NavigationContainer>
      </QueryClientProvider>,
    );
  });
  trees.push(tree);
  return { tree, nav, names: () => nav.getRootState()?.routes.map(route => route.name) };
}

function webView(tree: Renderer.ReactTestRenderer) {
  return tree.root.findAll(node => typeof node.props.onShouldStartLoadWithRequest === 'function')[0];
}

async function sendCode(tree: Renderer.ReactTestRenderer, repeat = false) {
  const web = webView(tree);
  const callback = { url: `${env.kakaoRedirectUri}?code=fixture-code` };
  await act(async () => {
    expect(web.props.onShouldStartLoadWithRequest(callback)).toBe(false);
    if (repeat) expect(web.props.onShouldStartLoadWithRequest(callback)).toBe(false);
  });
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
}

function serviceTransport(success = true) {
  globalThis.fetch = jest.fn(async () => ({
    ok: success,
    json: async () => success
      ? { success: true, data: service, message: null }
      : { success: false, data: null, message: 'fixture login failed' },
  } as Response));
}

beforeAll(() => {
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } });
});
beforeEach(() => {
  mockStackMounts = 0;
  useAuthStore.getState().logout();
  usePreferenceStore.setState({ hasHydrated: true, isCompleted: true, preferences: null });
  env.useMockApi = true;
});
afterEach(async () => {
  await act(() => { trees.splice(0).forEach(tree => tree.unmount()); });
  queryClient.clear();
  globalThis.fetch = previousFetch;
  env.useMockApi = originalMockMode;
  jest.restoreAllMocks();
});

test.each(['preview', 'service'] as const)('one fresh %s login opens first preferences on the existing navigator', async mode => {
  env.useMockApi = mode === 'preview';
  if (mode === 'service') serviceTransport();
  usePreferenceStore.setState({ isCompleted: false });
  const { tree, nav, names } = await mount();
  expect(names()).toEqual(['Login']);
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree, true);
  expect(names()).toEqual(['Preference']);
  expect(mockStackMounts).toBe(1);
  expect(usePreferenceStore.getState().isCompleted).toBe(false);
  if (mode === 'service') expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

test('preference skip on the existing navigator continues to Map', async () => {
  usePreferenceStore.setState({ isCompleted: false });
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  let skip: Renderer.ReactTestInstance | null = tree.root.findAll(node => node.props.children === '건너뛰기')[0] ?? null;
  while (skip && typeof skip.props.onPress !== 'function') skip = skip.parent;
  await act(() => skip!.props.onPress());
  expect(names()).toEqual(['Map']);
  expect(usePreferenceStore.getState()).toMatchObject({ isCompleted: true, preferences: null });
  expect(mockStackMounts).toBe(1);
});

test('a completed setup is retained on fresh login and logout restores the guest root', async () => {
  const preferences = { brands: ['콜드브루'], size: 'Large', orderMethod: '매장 이용', cafeType: '', tastes: [] };
  usePreferenceStore.setState({ preferences });
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  expect(names()).toEqual(['Map']);
  expect(usePreferenceStore.getState().preferences).toEqual(preferences);
  await act(() => useAuthStore.getState().logout());
  expect(names()).toEqual(['Login']);
  expect(mockStackMounts).toBe(1);
});

test.each(['preview', 'service'] as const)('successful same-mode %s login removes stale login routes', async mode => {
  env.useMockApi = mode === 'preview';
  if (mode === 'service') serviceTransport();
  useAuthStore.getState().setSession(mode === 'preview' ? preview : service);
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('Community'));
  await act(() => nav.navigate('Login'));
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  expect(names()).toEqual(['Map']);
  expect(mockStackMounts).toBe(1);
  expect(useSessionStore.getState().user?.id).toBe(mode === 'service' ? '42' : undefined);
});

test('same-mode login returns to unfinished preference setup', async () => {
  usePreferenceStore.setState({ isCompleted: false });
  useAuthStore.getState().setSession(preview);
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('Login'));
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  expect(names()).toEqual(['Preference']);
  expect(mockStackMounts).toBe(1);
});

test('service login opens a requested review destination once on the existing navigator', async () => {
  useAuthStore.getState().setSession(preview);
  env.useMockApi = false;
  serviceTransport();
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('KakaoLogin', { returnTo: { name: 'ReviewWrite', params: { cafeId: 'cafe-42' } } }));
  await sendCode(tree);
  expect(names()).toEqual(['Map', 'ReviewWrite']);
  expect(nav.getCurrentRoute()?.params).toEqual({ cafeId: 'cafe-42' });
  expect(mockStackMounts).toBe(1);
  expect(useAuthStore.getState().loginReturn).toBeNull();
  const request = jest.mocked(globalThis.fetch).mock.calls[0][1];
  expect(JSON.parse(String(request?.body))).toEqual({
    code: 'fixture-code', redirectUri: env.kakaoRedirectUri,
  });
});

test('failed login returns to Login, retains the session, and permits a successful retry', async () => {
  env.useMockApi = false;
  serviceTransport(false);
  useAuthStore.getState().setSession(service);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('Login'));
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  expect(names()).toEqual(['Map', 'Login']);
  expect(alert).toHaveBeenCalledWith('로그인 실패', 'fixture login failed');
  expect(useAuthStore.getState().accessToken).toBe(service.accessToken);
  serviceTransport();
  await act(() => nav.navigate('KakaoLogin'));
  await sendCode(tree);
  expect(names()).toEqual(['Map']);
});

test('a malformed callback reports login failure without throwing out of the WebView handler', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { tree, nav, names } = await mount();
  await act(() => nav.navigate('KakaoLogin'));
  await act(() => {
    expect(() => webView(tree).props.onShouldStartLoadWithRequest({
      url: `${env.kakaoRedirectUri}?code=%`,
    })).not.toThrow();
  });
  expect(alert).toHaveBeenCalledWith('로그인 실패', expect.any(String));
  expect(names()).toEqual(['Login']);
});
