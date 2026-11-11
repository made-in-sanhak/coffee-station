import React from 'react';
import { Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import type { Purchase } from '../../app/domain';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import { CaffeineGauge } from '../receipt/RewardVisuals';
import CalendarScreen from './CalendarScreen';

const mockUseResource = jest.fn();
jest.mock('../../app/api', () => ({
  useResource: (...args: unknown[]) => mockUseResource(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

test.each(['local', 'server'])('selecting a %s purchase date updates the gauge and keeps lifetime totals', async source => {
  const today = new Date();
  const otherDay = today.getDate() === 1 ? 2 : 1;
  const purchaseDate = new Date(today.getFullYear(), today.getMonth(), otherDay, 12);
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
    user: source === 'server'
      ? { id: 'customer', nickname: '테스트', profileImageUrl: null, role: 'USER' }
      : null,
    accessToken: null,
    refreshToken: null,
  });
  usePersonalStore.setState({
    purchases: source === 'local' ? [record] : [],
  });
  mockUseResource.mockImplementation((path: string) => ({
    data: source === 'server' && path === '/api/purchases' ? [record] : undefined,
    error: null,
  }));
  const props = {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
  } as unknown as React.ComponentProps<typeof CalendarScreen>;
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<CalendarScreen {...props} />);
  });
  expect(tree.root.findByType(CaffeineGauge).props.value).toBe(0);
  const dayButton = tree.root.findAllByProps({ testID: `calendar-day-${otherDay}` })
    .find(node => typeof node.props.onPress === 'function');
  await act(() => dayButton!.props.onPress());
  expect(tree.root.findByType(CaffeineGauge).props).toMatchObject({
    value: 250,
    day: '선택한 날',
  });
  expect(JSON.stringify(tree.toJSON())).toContain('기록 카페');
  const lifetimeCard = tree.root.findAllByType(Text).find(node =>
    node.props.children === '누적 주유'
    && node.parent?.children.some(sibling =>
      typeof sibling !== 'string' && sibling.props.children === '2잔',
    ),
  );
  expect(lifetimeCard).toBeDefined();
  await act(() => tree.unmount());
});
