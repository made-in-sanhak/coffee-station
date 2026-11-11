import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrderScreen from '../src/screens/order/OrderScreen';
import { useSessionStore } from '../src/store/sessionStore';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/app/api', () => ({
  api: { post: jest.fn() },
  useResource: (path: string) => ({
    data:
      path === '/api/deals/deal'
        ? {
            id: 'deal',
            cafeId: 'cafe',
            cafeName: '카페',
            menuName: '커피',
            price: 2400,
            originalPrice: 3000,
            stock: 100,
            active: true,
            startsAt: '2020-01-01T00:00:00.000Z',
            endsAt: '2099-01-01T00:00:00.000Z',
          }
        : undefined,
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));

test('checkout stops increasing quantity at the server limit even when the deal has more stock', async () => {
  jest.useFakeTimers();
  useSessionStore.setState({ user: null, accessToken: null });
  const client = new QueryClient();
  let tree!: Renderer.ReactTestRenderer;
  const props = {
    route: { params: { dealId: 'deal' } },
    navigation: { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() },
  } as unknown as React.ComponentProps<typeof OrderScreen>;
  await act(() => {
    tree = Renderer.create(
      <QueryClientProvider client={client}>
        <OrderScreen {...props} />
      </QueryClientProvider>,
    );
  });
  try {
    const increase = () =>
      tree.root.findAll(
        node =>
          node.props.accessibilityLabel === '수량 늘리기' &&
          typeof node.props.onPress === 'function',
      )[0];
    for (let i = 0; i < 25; i++) await act(() => increase().props.onPress());
    expect(increase().props.disabled).toBe(true);
    expect(
      tree.root.findAllByType(Text).some(node => node.props.children === 20),
    ).toBe(true);
  } finally {
    await act(() => tree.unmount());
    client.clear();
    jest.useRealTimers();
  }
});
