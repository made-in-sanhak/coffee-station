import {
  beginPayment,
  canCancelOrder,
  paymentDestination,
  remainingTime,
  trustedPaymentUrl,
  isPaymentReturn,
} from '../src/screens/order/orderFlow';

describe('server-confirmed payment flow', () => {
  test('only the fixed app return host and one matching order ID trigger status lookup', () => {
    expect(
      isPaymentReturn(
        'coffeestation://payment-return?orderId=order-1',
        'order-1',
      ),
    ).toBe(true);
    expect(
      isPaymentReturn(
        'coffeestation://payment-return?orderId=order-1&status=success',
        'order-1',
      ),
    ).toBe(true);
    for (const url of [
      'coffeestation://payment-return?orderId=other',
      'coffeestation://payment-return.evil?orderId=order-1',
      'https://payment-return?orderId=order-1',
      'coffeestation://payment-return?orderId=order-1&orderId=order-1',
      'coffeestation://payment-return?orderId=%ZZ',
    ])
      expect(isPaymentReturn(url, 'order-1')).toBe(false);
  });
  test.each(['PAID', 'ACCEPTED', 'READY', 'PICKED_UP'] as const)(
    '%s is confirmed by the server',
    status => {
      expect(paymentDestination(status)).toBe('OrderComplete');
    },
  );
  test.each(['FAILED', 'CANCELLED'] as const)(
    '%s returns to the failure screen',
    status => {
      expect(paymentDestination(status)).toBe('PaymentFailure');
    },
  );
  test('pending status cannot become a successful order', () => {
    expect(paymentDestination('PENDING_PAYMENT')).toBeNull();
    expect(canCancelOrder('PAID')).toBe(true);
    expect(canCancelOrder('ACCEPTED')).toBe(false);
  });
  test.each([
    'http://online-payment.kakaopay.com/pay',
    'https://online-payment.kakaopay.com.evil.test/pay',
    'https://evil.test/?next=kakaopay.com',
    'kakaotalk://pay',
    'https://user@online-payment.kakaopay.com/pay',
  ])('rejects untrusted payment URL %s', url => {
    expect(trustedPaymentUrl(url)).toBe(false);
  });
  test('accepts only the provider HTTPS payment host', () => {
    expect(
      trustedPaymentUrl('https://online-payment.kakaopay.com/pay/mobile/token'),
    ).toBe(true);
  });
  test('a payment preparation error retains the created order for retry', async () => {
    const state = { orderId: undefined as string | undefined };
    const calls: string[] = [];
    const transport = {
      post: async <T>(path: string) => {
        calls.push(path);
        if (path === '/api/orders') return { id: 'order-1' } as T;
        throw new Error('결제 서비스가 설정되지 않았습니다.');
      },
    };
    await expect(
      beginPayment(transport, state, {
        dealId: 'deal-1',
        quantity: 1,
        idempotencyKey: 'stable',
        termsAccepted: true,
      }),
    ).rejects.toThrow('설정되지');
    expect(state.orderId).toBe('order-1');
    await expect(
      beginPayment(transport, state, {
        dealId: 'deal-1',
        quantity: 1,
        idempotencyKey: 'stable',
        termsAccepted: true,
      }),
    ).rejects.toThrow();
    expect(calls.filter(path => path === '/api/orders')).toHaveLength(1);
  });
  test('an untrusted provider response is never opened', async () => {
    const transport = {
      post: async <T>() =>
        ({ orderId: 'order-1', paymentUrl: 'https://evil.test/pay' } as T),
    };
    await expect(
      beginPayment(
        transport,
        { orderId: 'order-1' },
        {
          dealId: 'deal-1',
          quantity: 1,
          idempotencyKey: 'stable',
          termsAccepted: true,
        },
      ),
    ).rejects.toThrow('결제 주소');
  });
  test('simultaneous payment taps share one order and preparation request', async () => {
    let created = 0,
      prepared = 0;
    const transport = {
      post: async <T>(path: string) => {
        if (path === '/api/orders') {
          created++;
          await Promise.resolve();
          return { id: 'order-1' } as T;
        }
        prepared++;
        return {
          orderId: 'order-1',
          paymentUrl: 'https://online-payment.kakaopay.com/pay/mobile/token',
        } as T;
      },
    };
    const state = {},
      input = {
        dealId: 'deal-1',
        quantity: 1,
        idempotencyKey: 'stable',
        termsAccepted: true as const,
      };
    await Promise.all([
      beginPayment(transport, state, input),
      beginPayment(transport, state, input),
    ]);
    expect(created).toBe(1);
    expect(prepared).toBe(1);
  });
  test('expired deal timers stop at zero', () => {
    expect(
      remainingTime('2026-11-01T00:00:00Z', Date.parse('2026-11-01T00:01:00Z')),
    ).toBe('00:00');
    expect(
      remainingTime('2026-11-01T00:12:30Z', Date.parse('2026-11-01T00:00:00Z')),
    ).toBe('12:30');
  });
});
