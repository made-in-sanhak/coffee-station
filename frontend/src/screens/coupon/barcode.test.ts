import { code128Values, code128Bars } from './barcode';

test('coupon barcode encodes actual text with Code 128 B checksum and stop', () => {
  expect(code128Values('AB')).toEqual([104, 33, 34, 102, 106]);
  expect(code128Bars('AB').reduce((sum, bar) => sum + bar.width, 0)).toBe(57);
});

test('unsupported characters never produce a different redeemable code', () => {
  expect(() => code128Values('쿠폰')).toThrow();
  expect(() => code128Values('')).toThrow();
});
