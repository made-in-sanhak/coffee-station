import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking, Modal, Text } from 'react-native';
import type { Deal, Event, Order } from '../src/app/domain';
import PaymentPendingScreen from '../src/screens/order/PaymentPendingScreen';
import OrderCompleteScreen from '../src/screens/order/OrderCompleteScreen';
import OwnerScreen from '../src/screens/owner/OwnerScreen';
import OwnerMenusScreen from '../src/screens/owner/OwnerMenusScreen';
import { api } from '../src/app/api';
import EventsScreen from '../src/screens/events/EventsScreen';
import { native } from '../src/app/native';
import OrderScreen from '../src/screens/order/OrderScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '../src/store/sessionStore';

const mockReload = jest.fn();
let mockData: Record<string, unknown> = {};
let mockError: string | null = null;
jest.mock('../src/app/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  useResource: (path: string) => ({
    data: mockData[path],
    loading: false,
    error: mockError,
    reload: mockReload,
  }),
}));
jest.mock('../src/app/native', () => ({
  native: {
    secureGet: jest.fn(async () => null),
    secureSet: jest.fn(async () => undefined),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const order: Order = {
  id: 'order-1',
  dealId: 'deal-1',
  quantity: 1,
  unitPrice: 9200,
  subtotal: 9200,
  discount: 1000,
  total: 8200,
  cafeId: 'cafe-1',
  cafeName: '실제 카페',
  menuName: '브런치 세트',
  status: 'PENDING_PAYMENT',
  createdAt: '2026-11-04T01:00:00Z',
  pickupCode: 'A-1',
};
const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
};
function renderedText(tree: Renderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(Text)
    .map(n => n.props.children)
    .flat(Infinity)
    .filter(v => typeof v === 'string')
    .join(' ');
}
beforeEach(() => {
  jest.useFakeTimers();
  mockData = { '/api/orders/order-1': { ...order } };
  mockError = null;
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('a provider return URL only reloads server status and never approves payment locally', async () => {
  let callback: ((event: { url: string }) => void) | undefined;
  jest
    .spyOn(Linking, 'addEventListener')
    .mockImplementation((_type, handler) => {
      callback = handler;
      return { remove: jest.fn() };
    });
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation,
    route: {
      params: {
        orderId: 'order-1',
        paymentUrl: 'https://online-payment.kakaopay.com/pay/mobile/token',
      },
    },
  } as unknown as React.ComponentProps<typeof PaymentPendingScreen>;
  await act(() => {
    tree = Renderer.create(<PaymentPendingScreen {...props} />);
  });
  await act(() =>
    callback?.({
      url: 'coffeestation://payment-return?orderId=other&status=success',
    }),
  );
  expect(mockReload).not.toHaveBeenCalled();
  await act(() =>
    callback?.({
      url: 'coffeestation://payment-return?orderId=order-1&status=success',
    }),
  );
  expect(mockReload).toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  mockData['/api/orders/order-1'] = { ...order, status: 'PAID' };
  await act(() => tree!.update(<PaymentPendingScreen {...props} />));
  expect(navigation.replace).toHaveBeenCalledWith('OrderComplete', {
    orderId: 'order-1',
  });
  await act(() => tree!.unmount());
});
test('the completed screen withholds success and pickup code until the server confirms payment', async () => {
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation,
    route: { params: { orderId: 'order-1' } },
  } as unknown as React.ComponentProps<typeof OrderCompleteScreen>;
  await act(() => {
    tree = Renderer.create(<OrderCompleteScreen {...props} />);
  });
  expect(renderedText(tree!)).not.toContain('결제가 완료됐어요');
  expect(renderedText(tree!)).not.toContain('A-1');
  mockData['/api/orders/order-1'] = { ...order, status: 'PAID' };
  await act(() => tree!.update(<OrderCompleteScreen {...props} />));
  expect(renderedText(tree!)).toContain('결제가 완료됐어요');
  expect(renderedText(tree!)).toContain('A-1');
  await act(() => tree!.unmount());
});
test('owner permission errors are shown without a fabricated dashboard', async () => {
  mockData = {};
  mockError = '점주 권한이 필요합니다. (403)';
  let tree: Renderer.ReactTestRenderer;
  const props = { navigation } as unknown as React.ComponentProps<
    typeof OwnerScreen
  >;
  await act(() => {
    tree = Renderer.create(<OwnerScreen {...props} />);
  });
  expect(renderedText(tree!)).toContain('점주 권한이 필요합니다. (403)');
  expect(renderedText(tree!)).not.toContain('1,284');
  await act(() => tree!.unmount());
});
test('an uncertain refund is shown as pending and cannot be submitted twice', async () => {
  mockData['/api/orders/order-1'] = {
    ...order,
    status: 'PAID',
    cancellationPending: true,
  };
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation,
    route: { params: { orderId: 'order-1' } },
  } as unknown as React.ComponentProps<typeof OrderCompleteScreen>;
  await act(() => {
    tree = Renderer.create(<OrderCompleteScreen {...props} />);
  });
  expect(renderedText(tree!)).toContain('환불 처리 결과를 확인하고 있어요');
  const cancel = tree!.root.findAll(
    n => n.props.label === '주문 취소' && typeof n.props.onPress === 'function',
  )[0];
  expect(cancel.props.disabled).toBe(true);
  await act(() => tree!.unmount());
});
test('inline menu edits preserve required server fields', async () => {
  const menu = {
    id: 'menu-1',
    cafeId: 'cafe-1',
    name: '카페라떼',
    size: 'Regular',
    temperature: 'ICE',
    price: 2900,
    caffeineMg: 120,
    available: true,
  };
  mockData = {
    '/api/owner/dashboard': { cafes: [{ id: 'cafe-1' }] },
    '/api/cafes/cafe-1/menus': [menu],
    '/api/owner/deals': [],
  };
  jest.mocked(api.patch).mockResolvedValue({ ...menu, price: 3000 });
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation,
    route: { params: { cafeId: 'cafe-1' } },
  } as unknown as React.ComponentProps<typeof OwnerMenusScreen>;
  await act(() => {
    tree = Renderer.create(<OwnerMenusScreen {...props} />);
  });
  const input = tree!.root.findAll(
    n =>
      n.props.accessibilityLabel === '카페라떼 가격' &&
      typeof n.props.onChangeText === 'function',
  )[0];
  await act(() => input.props.onChangeText('3000'));
  const save = tree!.root.findAll(
    n =>
      n.props.label === '변경 사항 저장 (1)' &&
      typeof n.props.onPress === 'function',
  )[0];
  await act(async () => save.props.onPress());
  expect(api.patch).toHaveBeenCalledWith(
    '/api/owner/menus/menu-1',
    expect.objectContaining({
      name: '카페라떼',
      size: 'Regular',
      temperature: 'ICE',
      price: 3000,
      caffeineMg: 120,
      available: true,
    }),
  );
  await act(() => tree!.unmount());
});
test('anonymous checkout has a working login action before private quote requests', async () => {
  useSessionStore.setState({ user: null, accessToken: null });
  mockData = {
    '/api/deals/deal-1': {
      id: 'deal-1',
      cafeId: 'cafe-1',
      cafeName: '카페',
      menuName: '커피',
      originalPrice: 3000,
      price: 2400,
      stock: 5,
      active: true,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 60000).toISOString(),
    },
  };
  const props = {
    navigation,
    route: { params: { dealId: 'deal-1' } },
  } as unknown as React.ComponentProps<typeof OrderScreen>;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <QueryClientProvider client={client}>
        <OrderScreen {...props} />
      </QueryClientProvider>,
    );
  });
  const login = tree!.root.findAll(
    n =>
      n.props.label === '로그인하고 주문하기' &&
      typeof n.props.onPress === 'function',
  );
  expect(login).toHaveLength(1);
  expect(api.post).not.toHaveBeenCalled();
  await act(() => login[0].props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Login');
  await act(() => tree!.unmount());
  client.clear();
});
test('an event popup requires a live server event and deal and closes when requested', async () => {
  const now = Date.now();
  const deal: Deal = {
    id: 'deal-1',
    cafeId: 'cafe-1',
    cafeName: '실제 카페',
    menuId: 'menu-1',
    menuName: '브런치 세트',
    price: 9200,
    originalPrice: 11500,
    stock: 2,
    startsAt: new Date(now - 60000).toISOString(),
    endsAt: new Date(now + 900000).toISOString(),
    active: true,
  };
  const event: Event = {
    id: 'event-1',
    title: '실제 이벤트',
    description: '매장 픽업 할인',
    dealId: 'deal-1',
  };
  mockData = { '/api/events': [], '/api/deals': [deal], '/api/cafes': [] };
  const props = { navigation } as unknown as React.ComponentProps<
    typeof EventsScreen
  >;
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<EventsScreen {...props} />);
    await Promise.resolve();
  });
  expect(tree!.root.findByType(Modal).props.visible).toBe(false);
  mockData['/api/events'] = [event];
  await act(() => tree!.update(<EventsScreen {...props} />));
  expect(tree!.root.findByType(Modal).props.visible).toBe(true);
  const close = tree!.root.findAll(
    n =>
      n.props.accessibilityLabel === '이벤트 팝업 닫기' &&
      typeof n.props.onPress === 'function',
  )[0];
  await act(() => close.props.onPress());
  expect(tree!.root.findByType(Modal).props.visible).toBe(false);
  await act(() => tree!.unmount());
  expect(native.secureGet).toHaveBeenCalled();
});
