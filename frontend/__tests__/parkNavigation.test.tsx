import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RootNavigator from '../src/navigation/RootNavigator';
import { useAuthStore } from '../src/store/authStore';
import { usePreferenceStore } from '../src/store/preferenceStore';

// Native stack presentation is outside Jest. Keep real navigator/store logic,
// and inspect the route definitions and actual preference completion callbacks.
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Group: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));
const fixture = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token',
  user: { id: 1, nickname: '미리보기', profileImageUrl: null } };
const routes = (tree: Renderer.ReactTestRenderer) => tree.root.findAll(node => typeof node.props.name === 'string').map(node => node.props.name);
beforeEach(() => {
  useAuthStore.getState().logout();
  usePreferenceStore.setState({ hasHydrated: true, isCompleted: false, preferences: null });
});

test('a fresh launch has only Park login routes and no Map bypass', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<RootNavigator />); });
  expect(routes(tree!)).toEqual(['Login', 'KakaoLogin']);
  await act(() => tree!.unmount());
});

test('Park login opens first preferences, completion retains Large and opens Map', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<RootNavigator />); useAuthStore.getState().setSession(fixture); });
  expect(routes(tree!)[0]).toBe('Preference');
  const navigation = { replace: jest.fn() };
  const element = tree!.root.findByProps({ name: 'Preference' }).props.children({ navigation });
  await act(() => element.props.onStart({ brands: ['카페라떼'], size: 'Large', orderMethod: '매장 이용', cafeType: '개인 카페', tastes: ['고소한'] }));
  expect(usePreferenceStore.getState().isCompleted).toBe(true);
  expect(usePreferenceStore.getState().preferences?.size).toBe('Large');
  expect(navigation.replace).toHaveBeenCalledWith('Map');
  expect(routes(tree!)[0]).toBe('Map');
  await act(() => tree!.unmount());
});

test('Park preference skip retains flow and preview private-action login routes exist', async () => {
  useAuthStore.getState().setSession(fixture);
  let tree: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<RootNavigator />); });
  const navigation = { replace: jest.fn() };
  const element = tree!.root.findByProps({ name: 'Preference' }).props.children({ navigation });
  await act(() => element.props.onSkip());
  expect(usePreferenceStore.getState().preferences).toBeNull();
  expect(navigation.replace).toHaveBeenCalledWith('Map');
  for (const name of ['Map','Login','KakaoLogin','LocationPermission','Recommend','Community','Garage','Receipt','CafeDetail','Order'])
    expect(routes(tree!)).toContain(name);
  await act(() => useAuthStore.getState().logout());
  expect(routes(tree!)).toEqual(['Login', 'KakaoLogin']);
  await act(() => tree!.unmount());
});
