import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import LoginScreen from '../src/screens/auth/LoginScreen';
import RootNavigator from '../src/navigation/RootNavigator';
import { useAuthStore } from '../src/store/authStore';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/utils/env', () => ({
  env: { kakaoRestApiKey: 'unit-test-public-app-id' },
}));
jest.mock('@react-navigation/native-stack', () => {
  const ReactModule = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: (props: object) => ReactModule.createElement('Route', props),
    }),
  };
});

test('login screen only opens the Kakao authentication route', async () => {
  const navigate = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  const props = { navigation: { navigate } } as unknown as React.ComponentProps<
    typeof LoginScreen
  >;
  await act(() => {
    tree = Renderer.create(<LoginScreen {...props} />);
  });
  const buttons = tree!.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );
  expect(buttons).toHaveLength(1);
  await act(() => buttons[0].props.onPress());
  expect(navigate).toHaveBeenCalledWith('KakaoLogin');
  expect(useAuthStore.getState().accessToken).toBeNull();
  await act(() => tree!.unmount());
});

test('map is only a route when an authenticated session exists', async () => {
  const original = useAuthStore.getState();
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    useAuthStore.getState().logout();
    tree = Renderer.create(<RootNavigator />);
  });
  const routes = () =>
    tree!.root
      .findAll(node => node.type === ('Route' as unknown))
      .map(node => node.props.name);
  expect(routes()).toEqual(['Login', 'KakaoLogin']);
  await act(() => {
    useAuthStore.setState({ accessToken: 'unit-test-session-only' });
  });
  expect(routes()).toEqual(['Map']);
  await act(() => useAuthStore.getState().logout());
  expect(routes()).toEqual(['Login', 'KakaoLogin']);
  await act(() => {
    tree!.unmount();
    useAuthStore.setState(original);
  });
});
