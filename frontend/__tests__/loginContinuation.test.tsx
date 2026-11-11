import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';
import RootNavigator from '../src/navigation/RootNavigator';
import KakaoLoginScreen from '../src/screens/auth/KakaoLoginScreen';
import { useAuthStore } from '../src/store/authStore';
import { usePreferenceStore } from '../src/store/preferenceStore';
import { useSessionStore } from '../src/store/sessionStore';
import { queryClient } from '../src/app/queryClient';
import { env } from '../src/utils/env';

let mockStackMounts = 0;
jest.mock('@react-navigation/native-stack', () => {
  const ReactModule = require('react');
  return { createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => {
      ReactModule.useEffect(() => { mockStackMounts++; }, []); return children;
    },
    Screen: () => null,
  }) };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));

const preview = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token',
  user: { id: 1, nickname: 'fixture preview', profileImageUrl: null } };
const service = { accessToken: 'fixture-service-access', refreshToken: 'fixture-service-refresh',
  user: { id: 42, nickname: 'fixture member', profileImageUrl: null } };
const previousFetch = globalThis.fetch;
const originalMockMode = env.useMockApi;
const trees: Renderer.ReactTestRenderer[] = [];
type StateShape = { routes: Array<{ name: string; key: string }>; index: number };

// Native presentation is excluded; the back stack and actions use the actual
// React Navigation StackRouter, including popTo and reset rehydration.
function stack(authenticated: boolean, complete: boolean, rootOverride?: string) {
  const routeNames = authenticated
    ? [...(complete ? [] : ['Preference']), 'Map', 'Community', 'Login', 'KakaoLogin']
    : ['Login', 'KakaoLogin'];
  const root = rootOverride ?? (authenticated ? complete ? 'Map' : 'Preference' : 'Login');
  const router = StackRouter({ initialRouteName: root });
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  const actions: string[] = [];
  const dispatch = (action: ReturnType<typeof CommonActions.goBack> | ReturnType<typeof StackActions.push> | any) => {
    const next = router.getStateForAction(state, action, options);
    if (!next) throw new Error('Unexpected unhandled test navigation');
    state = next.stale === false ? next : router.getRehydratedState(next, options);
    actions.push(action.type);
  };
  const navigation = {
    getState: () => state,
    popTo: (name: string) => dispatch(StackActions.popTo(name)),
    reset: (next: object) => dispatch(CommonActions.reset(next as any)),
    goBack: () => dispatch(CommonActions.goBack()),
    navigate: (name: string) => dispatch(CommonActions.navigate(name)),
  };
  return { navigation, push: (name: string) => dispatch(StackActions.push(name)),
    state: () => state as StateShape, names: () => state.routes.map(route => route.name), actions };
}
async function mount(navigation: ReturnType<typeof stack>['navigation']) {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<QueryClientProvider client={queryClient}>
    <RootNavigator />
    <KakaoLoginScreen {...({ navigation, route: { name: 'KakaoLogin', key: 'fixture-auth' } } as any)} />
  </QueryClientProvider>); });
  trees.push(tree); return tree;
}
async function sendCode(tree: Renderer.ReactTestRenderer) {
  const web = tree.root.findAll(node => typeof node.props.source?.uri === 'string')[0];
  let allowed!: boolean;
  await act(async () => { allowed = web.props.onShouldStartLoadWithRequest({ url: `${env.kakaoRedirectUri}?code=fixture-code` }); });
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
  expect(allowed).toBe(false);
}
function serviceTransport(success = true) {
  globalThis.fetch = jest.fn(async () => ({ ok: success,
    json: async () => success ? { success: true, data: service, message: null }
      : { success: false, data: null, message: 'fixture login failed' },
  } as Response));
}
beforeAll(() => { queryClient.setDefaultOptions({ queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } }); });
beforeEach(() => {
  mockStackMounts = 0; useAuthStore.getState().logout();
  usePreferenceStore.setState({ hasHydrated: true, isCompleted: true, preferences: null });
  env.useMockApi = true;
});
afterEach(async () => {
  await act(() => { trees.splice(0).forEach(tree => tree.unmount()); });
  queryClient.clear(); globalThis.fetch = previousFetch; env.useMockApi = originalMockMode; jest.restoreAllMocks();
});

test('same preview re-login returns to existing Map and removes auth/back entries', async () => {
  useAuthStore.getState().setSession(preview);
  const nav = stack(true, true); nav.push('Community'); nav.push('Login'); nav.push('KakaoLogin');
  const tree = await mount(nav.navigation); await sendCode(tree);
  expect(nav.names()).toEqual(['Map']); expect(nav.state().index).toBe(0);
  expect(mockStackMounts).toBe(1); expect(useSessionStore.getState().user).toBeNull();
});

test('same preview re-login keeps unfinished Preference as the sole root', async () => {
  usePreferenceStore.setState({ isCompleted: false }); useAuthStore.getState().setSession(preview);
  const nav = stack(true, false); nav.push('Login'); nav.push('KakaoLogin');
  const tree = await mount(nav.navigation); await sendCode(tree);
  expect(nav.names()).toEqual(['Preference']); expect(nav.state().index).toBe(0);
  expect(usePreferenceStore.getState().isCompleted).toBe(false);
});

test('same service branch returns to existing Map after actual service mutation success', async () => {
  env.useMockApi = false; serviceTransport(); useAuthStore.getState().setSession(service);
  const nav = stack(true, true); nav.push('Login'); nav.push('KakaoLogin');
  const tree = await mount(nav.navigation); await sendCode(tree);
  expect(nav.names()).toEqual(['Map']); expect(nav.state().index).toBe(0);
  expect(mockStackMounts).toBe(1); expect(useSessionStore.getState().user?.id).toBe('42');
});

test.each(['preview','service'] as const)('fresh guest -> %s leaves branch replacement authoritative', async mode => {
  env.useMockApi = mode === 'preview'; if (mode === 'service') serviceTransport();
  usePreferenceStore.setState({ isCompleted: false });
  const nav = stack(false, false); nav.push('KakaoLogin');
  const actionsBefore = nav.actions.length;
  const tree = await mount(nav.navigation);
  const authKeys = () => tree.root.findAll(node=>node.props.name==='Login' || node.props.name==='KakaoLogin').map(node=>node.props.navigationKey);
  expect(authKeys()).toEqual(['guest','guest']);
  await sendCode(tree);
  expect(authKeys()).toEqual([mode,mode]);
  expect(mockStackMounts).toBe(1); expect(nav.actions).toHaveLength(actionsBefore);
  const registered = tree.root.findAll(node => typeof node.props.name === 'string').map(node => node.props.name);
  expect(registered[0]).toBe('Preference');
});

test('preview -> service branch reset is not given stale old-stack completion', async () => {
  useAuthStore.getState().setSession(preview); env.useMockApi = false; serviceTransport();
  const nav = stack(true, true); nav.push('Login'); nav.push('KakaoLogin');
  const actionsBefore = nav.actions.length;
  const tree = await mount(nav.navigation); await sendCode(tree);
  expect(mockStackMounts).toBe(1); expect(nav.actions).toHaveLength(actionsBefore);
  expect(useSessionStore.getState().user?.id).toBe('42');
});

test('failed login keeps original back/error behavior and a new attempt can succeed', async () => {
  env.useMockApi = false; serviceTransport(false); useAuthStore.getState().setSession(service);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const nav = stack(true, true); nav.push('Login'); nav.push('KakaoLogin');
  const first = await mount(nav.navigation); await sendCode(first);
  expect(nav.names()).toEqual(['Map','Login']); expect(alert).toHaveBeenCalledWith('로그인 실패','fixture login failed');
  expect(useAuthStore.getState().accessToken).toBe(service.accessToken);
  await act(() => first.unmount()); trees.splice(trees.indexOf(first),1);
  serviceTransport(true); nav.push('KakaoLogin');
  const retry = await mount(nav.navigation); await sendCode(retry);
  expect(nav.names()).toEqual(['Map']); expect(nav.state().index).toBe(0);
});

test('registered but absent root resets without duplicate or back-to-login history', async () => {
  useAuthStore.getState().setSession(preview);
  const nav = stack(true, true, 'Login'); nav.push('KakaoLogin');
  const tree = await mount(nav.navigation); await sendCode(tree);
  expect(nav.names()).toEqual(['Map']); expect(nav.state().index).toBe(0);
});

test.each([true,false])('first login discards guest routes and opens the correct root (setup completed=%s)', completed => {
  const nav=stack(false,completed);nav.push('KakaoLogin');
  const destination=completed?'Map':'Preference';
  const next=StackRouter({}).getStateForRouteNamesChange(nav.state() as any,{
    routeNames:[...(completed?[]:['Preference']),'Map','Login','KakaoLogin'],
    routeParamList:{},routeGetIdList:{},routeKeyChanges:['Login','KakaoLogin'],
  });
  expect(next.routes.map(route=>route.name)).toEqual([destination]);
  expect(next.routes[next.index].name).toBe(destination);
});
