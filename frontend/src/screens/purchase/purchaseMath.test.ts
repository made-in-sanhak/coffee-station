import {
  monthCells,
  moveMonth,
  summarizePurchases,
  recordsOnDate,
  couponStatus,
  purchaseSourceLabel,
} from './purchaseMath';

test('calendar starts on Sunday and handles leap years and year boundaries', () => {
  expect(monthCells(2026, 9).slice(0, 5)).toEqual([null, null, null, null, 1]);
  expect(monthCells(2024, 1).filter(Boolean)).toHaveLength(29);
  expect(moveMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  expect(moveMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
});

test('timestamp expiry is enforced within its calendar day', () => {
  expect(
    couponStatus(
      { expiresAt: '2026-10-05T08:00:00Z' },
      new Date('2026-10-05T09:00:00Z'),
    ),
  ).toBe('expired');
  expect(
    couponStatus(
      { expiresAt: '2026-10-05T10:00:00Z' },
      new Date('2026-10-05T09:00:00Z'),
    ),
  ).toBe('available');
});

test('confirmed app orders retain their actual source label', () => {
  expect(purchaseSourceLabel({ source: 'order', verified: true })).toBe(
    '앱 주문',
  );
  expect(purchaseSourceLabel({ source: 'manual', verified: false })).toBe(
    '직접 입력한 기록',
  );
});

test('month totals exclude other months and compute caffeine from recorded days', () => {
  const records = [
    {
      purchasedAt: '2026-10-13T08:42:00',
      totalAmount: 2000,
      totalCups: 1,
      caffeineMg: 150,
    },
    {
      purchasedAt: '2026-10-13T14:10:00',
      totalAmount: 2500,
      totalCups: 1,
      caffeineMg: 150,
    },
    {
      purchasedAt: '2026-10-14T10:00:00',
      totalAmount: 4000,
      totalCups: 2,
      caffeineMg: 200,
    },
    {
      purchasedAt: '2026-11-01T08:42:00',
      totalAmount: 10000,
      totalCups: 3,
      caffeineMg: 400,
    },
  ];
  expect(summarizePurchases(records, 2026, 9)).toEqual({
    totalAmount: 8500,
    totalCups: 4,
    purchaseCount: 3,
    averageCaffeineMg: 250,
  });
  expect(recordsOnDate(records, '2026-10-13')).toHaveLength(2);
  expect(summarizePurchases([], 2026, 9).averageCaffeineMg).toBe(0);
});

test('used coupon stays used past its expiry and expiry day stays available', () => {
  expect(
    couponStatus(
      { usedAt: '2026-10-01', expiresAt: '2026-10-02' },
      new Date('2026-10-05T00:00:00'),
    ),
  ).toBe('used');
  expect(
    couponStatus({ expiresAt: '2026-10-05' }, new Date('2026-10-05T12:00:00')),
  ).toBe('available');
  expect(
    couponStatus({ expiresAt: '2026-10-04' }, new Date('2026-10-05T12:00:00')),
  ).toBe('expired');
});
