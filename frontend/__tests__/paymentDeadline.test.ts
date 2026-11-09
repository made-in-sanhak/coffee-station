import { paymentDeadline, remainingTime } from '../src/screens/order/orderFlow';

test('payment deadline uses the server order creation time and does not restart on app return', () => {
  const order = { createdAt: '2026-11-07T03:00:00.000Z' };
  const end = paymentDeadline(order.createdAt);
  expect(end).toBe('2026-11-07T03:15:00.000Z');
  expect(remainingTime(end, Date.parse('2026-11-07T03:02:30.000Z'))).toBe(
    '12:30',
  );
  expect(remainingTime(end, Date.parse('2026-11-07T03:20:00.000Z'))).toBe(
    '00:00',
  );
});
test('missing or invalid server creation time cannot create a new payment timer', () => {
  expect(paymentDeadline(undefined)).toBeUndefined();
  expect(paymentDeadline('invalid')).toBeUndefined();
});
