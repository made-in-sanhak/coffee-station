import { getLastOrder, saveLastOrder } from '../src/screens/order/lastOrder';
const mockDisk = new Map<string, string>();
jest.mock('../src/app/native', () => ({
  native: {
    secureGet: async (key: string) => mockDisk.get(key) ?? null,
    secureSet: async (key: string, value: string) => {
      mockDisk.set(key, value);
    },
  },
}));
beforeEach(() => mockDisk.clear());
test('last order recovery is isolated by authenticated account and stores no payment state', async () => {
  await saveLastOrder('account-a', 'order-a');
  await saveLastOrder('account-b', 'order-b');
  expect(await getLastOrder('account-a')).toBe('order-a');
  expect(await getLastOrder('account-b')).toBe('order-b');
  expect(await getLastOrder('account-c')).toBeNull();
  expect([...mockDisk.values()].sort()).toEqual(['order-a', 'order-b']);
});
test('corrupt stored order references are reported rather than used as navigation URLs', async () => {
  mockDisk.set('coffee.last-order.account-a', 'https://evil.test/pay');
  await expect(getLastOrder('account-a')).rejects.toThrow('주문 정보');
});
