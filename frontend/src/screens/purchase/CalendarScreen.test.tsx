import React from 'react';
import { Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import type { Purchase } from '../../app/domain';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import CalendarScreen from './CalendarScreen';

const mockUseResource = jest.fn();
jest.mock('../../app/api', () => ({
  useResource: (...args: unknown[]) => mockUseResource(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

test.each(['local', 'server'])(
  'selecting a %s purchase date shows that day and the month stats',
  async source => {
    const today = new Date();
    const otherDay = today.getDate() === 1 ? 2 : 1;
    const purchaseDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      otherDay,
      12,
    );
    const record: Purchase = {
      id: 'purchase-test',
      cafeName: '기록 카페',
      menuName: '아메리카노',
      quantity: 2,
      unitPrice: 2000,
      total: 4000,
      purchasedAt: purchaseDate.toISOString(),
      caffeineMg: 125,
      source: 'manual',
      verified: false,
    };
    useSessionStore.setState({
      user:
        source === 'server'
          ? {
              id: 'customer',
              nickname: '테스트',
              profileImageUrl: null,
              role: 'USER',
            }
          : null,
      accessToken: null,
      refreshToken: null,
    });
    usePersonalStore.setState({
      purchases: source === 'local' ? [record] : [],
    });
    mockUseResource.mockImplementation((path: string) => ({
      data:
        source === 'server' && path === '/api/purchases' ? [record] : undefined,
      error: null,
    }));
    const props = {
      navigation: { navigate: jest.fn(), goBack: jest.fn() },
    } as unknown as React.ComponentProps<typeof CalendarScreen>;
    let tree!: Renderer.ReactTestRenderer;
    await act(() => {
      tree = Renderer.create(<CalendarScreen {...props} />);
    });
    expect(JSON.stringify(tree.toJSON())).not.toContain('기록 카페');
    const dayButton = tree.root
      .findAllByProps({ testID: `calendar-day-${otherDay}` })
      .find(node => typeof node.props.onPress === 'function');
    await act(() => dayButton!.props.onPress());
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('기록 카페');
    expect(rendered).not.toMatch(/카페인|mg/);
    expect(rendered).not.toContain('나의 차고');
    const editPreferences = tree.root.findAll(
      node =>
        node.props.label === '나의 커피 취향 수정' &&
        typeof node.props.onPress === 'function',
    )[0];
    expect(editPreferences).toBeDefined();
    await act(() => editPreferences.props.onPress());
    expect(props.navigation.navigate).toHaveBeenCalledWith('Preferences');
    expect(statValues(tree)).toEqual({
      '이번 달 지출': '4,000원',
      구매: '2잔',
      '작성 리뷰': '—',
      '한 잔 평균': '2,000원',
    });
    expect(rendered).not.toMatch(/누적 주유|방문 카페|아낀 금액/);
    await act(() => tree.unmount());
  },
);

function statValues(tree: Renderer.ReactTestRenderer) {
  const labels = ['이번 달 지출', '구매', '작성 리뷰', '한 잔 평균'];
  return Object.fromEntries(
    labels.map(label => {
      const node = tree.root
        .findAllByType(Text)
        .find(text => text.props.children === label)!;
      const value = node.parent!.findAllByType(Text)[1].props.children;
      return [label, Array.isArray(value) ? value.join('') : value];
    }),
  );
}

test('coupon shortcut and floating receipt button lead to coupons and receipt registration', async () => {
  useSessionStore.setState({
    user: { id: '1', nickname: '테스트', profileImageUrl: null, role: 'USER' },
    accessToken: 'token',
    refreshToken: 'refresh',
  });
  usePersonalStore.setState({ purchases: [] });
  const coupon = (id: string, expiresAt: string, usedAt: string | null = null) => ({
    id,
    title: '쿠폰',
    type: 'FIXED',
    value: 1000,
    minSpend: 0,
    expiresAt,
    usedAt,
  });
  mockUseResource.mockImplementation((path: string) => ({
    data:
      path === '/api/coupons'
        ? [
            coupon('a', '2099-12-31'),
            coupon('b', '2099-12-31'),
            coupon('c', '2099-12-31', '2026-01-01'),
            coupon('d', '2000-01-01'),
          ]
        : path === '/api/users/me/statistics'
        ? { stamps: 5, reviewCount: 7 }
        : [],
    error: null,
  }));
  const navigate = jest.fn();
  const props = {
    navigation: { navigate, goBack: jest.fn() },
  } as unknown as React.ComponentProps<typeof CalendarScreen>;
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<CalendarScreen {...props} />);
  });
  const rendered = JSON.stringify(tree.toJSON());
  expect(rendered).toContain('사용 가능 쿠폰 ');
  expect(rendered).toContain('다음 쿠폰까지 영수증 1회 · 눌러서 쿠폰 보기');
  expect(statValues(tree)['작성 리뷰']).toBe('7개');
  expect(statValues(tree)['한 잔 평균']).toBe('—');
  const shortcut = tree.root.findAll(
    node => node.props.testID === 'calendar-coupon-shortcut' && node.props.accessibilityLabel,
  )[0];
  expect(shortcut.props.accessibilityLabel).toContain('사용 가능 쿠폰 2장');
  await act(() => shortcut.props.onPress());
  expect(navigate).toHaveBeenLastCalledWith('Coupons');
  const fab = tree.root.findAll(
    node => node.props.testID === 'calendar-receipt-fab' && typeof node.props.onPress === 'function',
  )[0];
  await act(() => fab.props.onPress());
  expect(navigate).toHaveBeenLastCalledWith('Receipt');
  await act(() => tree.unmount());
});
