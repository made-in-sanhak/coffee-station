import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import {
  applyInviteCodeInput,
  emptyInviteCode,
  inviteErrorMessage,
  parseOwnerInviteUrl,
} from '../src/screens/owner/invite/inviteCode';
import {
  MOCK_OWNER_INVITE_CODE,
  mockAcceptOwnerInvite,
  mockOwnerLinkStatus,
  mockVerifyOwnerInvite,
  resetMockOwnerInvite,
} from '../src/api/mocks/ownerInvite';
import { useOwnerInviteStore } from '../src/store/ownerInviteStore';
import { useSessionStore } from '../src/store/sessionStore';
import OwnerInviteScreen from '../src/screens/owner/invite/OwnerInviteScreen';
import OwnerStoreConfirmScreen from '../src/screens/owner/invite/OwnerStoreConfirmScreen';
import OwnerLoginScreen from '../src/screens/owner/invite/OwnerLoginScreen';
import LoginScreen from '../src/screens/auth/LoginScreen';

const mockVerify = jest.fn();
const mockAccept = jest.fn();
const mockStatus = jest.fn();
jest.mock('../src/api/endpoints/ownerInvite', () => ({
  verifyOwnerInvite: (code: string) => mockVerify(code),
  acceptOwnerInvite: (code: string) => mockAccept(code),
  getOwnerLinkStatus: () => mockStatus(),
}));
jest.mock('../src/utils/env', () => ({
  env: { useMockApi: true, kakaoRestApiKey: 'test-key' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const cafe = { id: 'c1', name: '메가MGC커피 OO역점', address: '서울 중구 세종대로 110' };
const nav = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
});
const route = <T,>(name: string, params: T) => ({ key: name, name, params });
const pressable = (tree: Renderer.ReactTestRenderer, testID: string) =>
  tree.root.findAll(node => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
const digitInputs = (tree: Renderer.ReactTestRenderer) =>
  Array.from({ length: 6 }, (_, index) =>
    tree.root.findAll(
      node => node.props.testID === `owner-invite-digit-${index}` && node.props.onChangeText,
    )[0],
  );
const hasText = (tree: Renderer.ReactTestRenderer, text: string) =>
  tree.root.findAllByType(Text).some(node => node.props.children === text);

beforeEach(() => {
  mockVerify.mockReset();
  mockAccept.mockReset();
  mockStatus.mockReset().mockResolvedValue({ linked: false, cafe: null, menuCount: 0 });
  useOwnerInviteStore.setState({ pendingCode: null });
});

test('code input uppercases, moves to the next box, replaces a filled box and accepts a pasted code', () => {
  let state = applyInviteCodeInput(emptyInviteCode(), 0, 'k');
  expect(state).toEqual({ digits: ['K', '', '', '', '', ''], focusIndex: 1 });
  state = applyInviteCodeInput(state.digits, 0, 'K7');
  expect(state).toEqual({ digits: ['7', '', '', '', '', ''], focusIndex: 1 });
  state = applyInviteCodeInput(emptyInviteCode(), 2, ' k7-2m q8 ');
  expect(state).toEqual({ digits: ['K', '7', '2', 'M', 'Q', '8'], focusIndex: 5 });
  state = applyInviteCodeInput(state.digits, 3, '');
  expect(state.digits).toEqual(['K', '7', '2', '', 'Q', '8']);
  expect(applyInviteCodeInput(emptyInviteCode(), 1, '!').digits).toEqual(emptyInviteCode());
});

test('deep links only yield complete six character codes', () => {
  expect(parseOwnerInviteUrl('coffeestation://owner/invite?code=K72MQ8')).toBe('K72MQ8');
  expect(parseOwnerInviteUrl('coffeestation://owner/invite?ref=x&code=k72mq8')).toBe('K72MQ8');
  expect(parseOwnerInviteUrl('coffeestation://owner/invite?code=K72')).toBeNull();
  expect(parseOwnerInviteUrl('coffeestation://payment-return?code=K72MQ8')).toBeNull();
  expect(parseOwnerInviteUrl(null)).toBeNull();
});

test('error text shows the server message first, otherwise the remaining attempts', () => {
  expect(inviteErrorMessage({ remainingAttempts: 4 })).toBe('코드가 맞지 않아요. 다시 확인해 주세요 (남은 시도 4회)');
  expect(inviteErrorMessage({ remainingAttempts: 0, message: '만료된 코드예요' })).toBe('만료된 코드예요');
});

test('mock api counts attempts and links the owner only with the right code', () => {
  resetMockOwnerInvite();
  expect(mockVerifyOwnerInvite('AAAAAA')).toMatchObject({ valid: false, remainingAttempts: 4 });
  expect(mockVerifyOwnerInvite(MOCK_OWNER_INVITE_CODE)).toMatchObject({ valid: true, remainingAttempts: 4 });
  expect(mockOwnerLinkStatus().linked).toBe(false);
  expect(() => mockAcceptOwnerInvite('AAAAAA')).toThrow();
  mockAcceptOwnerInvite(MOCK_OWNER_INVITE_CODE);
  expect(mockOwnerLinkStatus()).toMatchObject({ linked: true, menuCount: 0 });
  resetMockOwnerInvite();
});

test('confirm stays disabled until six characters, a wrong code shows the error and a right code opens store confirm', async () => {
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerInviteScreen {...({ navigation, route: route('OwnerInvite', undefined) } as any)} />,
    );
  });
  expect(pressable(tree, 'owner-invite-submit').props.disabled).toBe(true);
  expect(hasText(tree, '영문 대문자와 숫자 6자리 · 한 번만 쓸 수 있고 7일 뒤 만료돼요')).toBe(true);
  await act(() => digitInputs(tree)[0].props.onChangeText('k72mq9'));
  expect(digitInputs(tree).map(input => input.props.value).join('')).toBe('K72MQ9');
  expect(pressable(tree, 'owner-invite-submit').props.disabled).toBe(false);

  mockVerify.mockResolvedValueOnce({ valid: false, cafe: null, remainingAttempts: 4 });
  await act(async () => {
    await pressable(tree, 'owner-invite-submit').props.onPress();
  });
  expect(mockVerify).toHaveBeenCalledWith('K72MQ9');
  expect(hasText(tree, '코드가 맞지 않아요. 다시 확인해 주세요 (남은 시도 4회)')).toBe(true);
  expect(pressable(tree, 'owner-invite-submit').props.label).toBe('다시 확인');
  expect(digitInputs(tree)[0].props.style).toEqual(expect.arrayContaining([expect.objectContaining({ borderWidth: 2 })]));

  await act(() => digitInputs(tree)[5].props.onChangeText('8'));
  expect(tree.root.findAll(node => node.props.testID === 'owner-invite-error')).toHaveLength(0);
  mockVerify.mockResolvedValueOnce({ valid: true, cafe, remainingAttempts: 4 });
  await act(async () => {
    await pressable(tree, 'owner-invite-submit').props.onPress();
  });
  expect(navigation.navigate).toHaveBeenCalledWith('OwnerStoreConfirm', { code: 'K72MQ8', cafe });
  await act(() => tree.unmount());
});

test('a deep link code is filled in and an already linked owner goes straight to the owner center', async () => {
  useOwnerInviteStore.setState({ pendingCode: 'K72MQ8' });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerInviteScreen {...({ navigation, route: route('OwnerInvite', undefined) } as any)} />,
    );
  });
  expect(digitInputs(tree).map(input => input.props.value).join('')).toBe('K72MQ8');
  expect(useOwnerInviteStore.getState().pendingCode).toBeNull();
  expect(navigation.replace).not.toHaveBeenCalled();
  await act(() => tree.unmount());

  mockStatus.mockResolvedValue({ linked: true, cafe, menuCount: 3 });
  await act(() => {
    tree = Renderer.create(
      <OwnerInviteScreen {...({ navigation, route: route('OwnerInvite', { code: 'AB12CD' }) } as any)} />,
    );
  });
  expect(navigation.replace).toHaveBeenCalledWith('Owner');
  await act(() => tree.unmount());
});

test('store confirm links the account and resets to the owner center, or goes back for another store', async () => {
  useSessionStore.setState({ user: { id: '1', nickname: '사장님', profileImageUrl: null, role: 'USER' } } as any);
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <OwnerStoreConfirmScreen {...({ navigation, route: route('OwnerStoreConfirm', { code: 'K72MQ8', cafe }) } as any)} />,
    );
  });
  expect(hasText(tree, '카카오 · 사장님')).toBe(true);
  expect(hasText(tree, '코드 확인됨')).toBe(true);
  await act(() => pressable(tree, 'owner-store-reject').props.onPress());
  expect(navigation.goBack).toHaveBeenCalled();
  mockAccept.mockResolvedValueOnce({ cafe, menuCount: 0 });
  await act(async () => {
    await pressable(tree, 'owner-store-confirm').props.onPress();
  });
  expect(mockAccept).toHaveBeenCalledWith('K72MQ8');
  expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Map' }, { name: 'Owner' }] });
  await act(() => tree.unmount());
});

test('login links to the owner login, which returns to the invite screen after kakao login', async () => {
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<LoginScreen {...({ navigation, route: route('Login', undefined) } as any)} />);
  });
  await act(() => pressable(tree, 'login-owner').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('OwnerLogin');
  await act(() => tree.unmount());

  useOwnerInviteStore.setState({ pendingCode: 'K72MQ8' });
  await act(() => {
    tree = Renderer.create(<OwnerLoginScreen {...({ navigation, route: route('OwnerLogin', undefined) } as any)} />);
  });
  expect(hasText(tree, '점주 센터')).toBe(true);
  await act(() => pressable(tree, 'owner-login-kakao').props.onPress());
  expect(navigation.navigate).toHaveBeenLastCalledWith('KakaoLogin', {
    returnTo: { name: 'OwnerInvite', params: { code: 'K72MQ8' } },
  });
  await act(() => pressable(tree, 'owner-login-user').props.onPress());
  expect(navigation.goBack).toHaveBeenCalled();
  await act(() => tree.unmount());
});
