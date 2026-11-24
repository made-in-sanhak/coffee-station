import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { api, useResource } from '../../app/api';
import { useSessionStore } from '../../store/sessionStore';
import CouponsScreen from './CouponsScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../../app/api', () => ({
  api: { post: jest.fn() },
  useResource: jest.fn(),
}));

test('receipt progress card and its soft button both open receipt registration', async () => {
  useSessionStore.setState({
    user: { id: 'user', nickname: '테스트', profileImageUrl: null, role: 'USER' },
    accessToken: 'token',
  });
  (useResource as jest.Mock).mockImplementation((path: string) => ({
    data: path === '/api/coupons' ? [] : { stamps: 2 },
    loading: false,
    error: null,
    reload: jest.fn(),
  }));
  const navigate = jest.fn();
  const props = {
    navigation: { navigate, goBack: jest.fn(), canGoBack: () => true },
  } as unknown as React.ComponentProps<typeof CouponsScreen>;
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<CouponsScreen {...props} />);
  });
  expect(JSON.stringify(tree.toJSON())).toContain('다음 쿠폰까지 영수증 1회');
  const pressable = (testID: string) =>
    tree.root.findAll(
      node => node.props.testID === testID && typeof node.props.onPress === 'function',
    )[0];
  expect(pressable('coupon-go-receipt').props.label).toBe('영수증 등록하러 가기');
  await act(() => pressable('coupon-go-receipt').props.onPress());
  await act(() => pressable('coupon-receipt-progress').props.onPress());
  expect(navigate.mock.calls).toEqual([['Receipt'], ['Receipt']]);
  await act(() => tree.unmount());
});

test('failed redemption keeps real coupon available and never shows a successful use', async () => {
  useSessionStore.setState({
    user: {
      id: 'user',
      nickname: '테스트',
      profileImageUrl: null,
      role: 'USER',
    },
    accessToken: 'token',
  });
  const coupon = {
    id: 'real-coupon',
    title: '실제 발급 쿠폰',
    type: 'FIXED',
    value: 1000,
    minSpend: 0,
    expiresAt: '2099-12-31',
    status: 'ACTIVE',
    code: 'AB',
  };
  (useResource as jest.Mock).mockImplementation((path: string) => ({
    data: path === '/api/coupons' ? [coupon] : { stamps: 0 },
    loading: false,
    error: null,
    reload: jest.fn(),
  }));
  (api.post as jest.Mock).mockRejectedValue(
    new Error('이미 사용되었거나 사용할 수 없는 쿠폰입니다.'),
  );
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree!: Renderer.ReactTestRenderer;
  const props = {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: () => true,
    },
  } as unknown as React.ComponentProps<typeof CouponsScreen>;
  await act(() => {
    tree = Renderer.create(<CouponsScreen {...props} />);
  });
  await act(() =>
    tree.root
      .findAll(node => node.props.testID === 'coupon-redeem-real-coupon')[0]
      .props.onPress(),
  );
  expect(api.post).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[0][2]![1].onPress!;
  await act(async () => {
    await confirm();
  });
  expect(api.post).toHaveBeenCalledWith('/api/coupons/real-coupon/use', {});
  expect(
    tree.root.findAll(node => node.props.testID === 'coupon-redeem-real-coupon')
      .length,
  ).toBeGreaterThan(0);
  expect(JSON.stringify(tree.toJSON())).toContain(
    '이미 사용되었거나 사용할 수 없는 쿠폰입니다.',
  );
  expect(coupon.status).toBe('ACTIVE');
  await act(() => tree.unmount());
  alert.mockRestore();
});
