export interface PurchaseSummaryInput {
  purchasedAt: string;
  totalAmount: number;
  totalCups: number;
  caffeineMg: number;
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function purchaseDateKey(value: string) {
  return localDateKey(new Date(value));
}

export function monthCells(year: number, month: number): Array<number | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function moveMonth(year: number, month: number, direction: number) {
  const next = new Date(year, month + direction, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function recordsOnDate<T extends { purchasedAt: string }>(
  records: T[],
  key: string,
): T[] {
  return records
    .filter(record => purchaseDateKey(record.purchasedAt) === key)
    .sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt));
}

export function summarizePurchases(
  records: PurchaseSummaryInput[],
  year: number,
  month: number,
) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const selected = records.filter(record =>
    purchaseDateKey(record.purchasedAt).startsWith(prefix),
  );
  const dates = new Set(
    selected.map(record => purchaseDateKey(record.purchasedAt)),
  );
  return {
    totalAmount: selected.reduce((sum, record) => sum + record.totalAmount, 0),
    totalCups: selected.reduce((sum, record) => sum + record.totalCups, 0),
    purchaseCount: selected.length,
    averageCaffeineMg: dates.size
      ? Math.round(
          selected.reduce((sum, record) => sum + record.caffeineMg, 0) /
            dates.size,
        )
      : 0,
  };
}

export type CouponStatus = 'available' | 'used' | 'expired';
export function couponStatus(
  coupon: { usedAt?: string | null; expiresAt: string; status?: string },
  now = new Date(),
): CouponStatus {
  if (coupon.usedAt || coupon.status?.toLowerCase() === 'used') return 'used';
  if (coupon.status?.toLowerCase() === 'expired') return 'expired';
  if (
    coupon.expiresAt.includes('T') &&
    new Date(coupon.expiresAt).getTime() <= now.getTime()
  )
    return 'expired';
  if (coupon.expiresAt.slice(0, 10) < localDateKey(now)) return 'expired';
  return 'available';
}

export function purchaseSourceLabel(record: {
  source: string;
  verified: boolean;
}) {
  if (record.source === 'order') return '앱 주문';
  if (record.verified) return '인증된 영수증 기록';
  return record.source === 'ocr'
    ? '영수증 인식 기록 · 미인증'
    : '직접 입력한 기록';
}
