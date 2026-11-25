import { clovaReceiptDraft } from './clovaReceipt';
import { receiptDraftToForm } from './receiptForm';

const word = (inferText: string, x: number, y: number) => ({
  inferText,
  boundingPoly: {
    vertices: [
      { x, y },
      { x: x + 10, y },
      { x: x + 10, y: y + 10 },
      { x, y: y + 10 },
    ],
  },
});

test('reads the Korean receipt by position even when OCR fields arrive out of order', () => {
  const fields = [
    word('메가MGC커피', 0, 0),
    word('한국항공대역점', 100, 0),
    word('2026-11-06', 0, 40),
    word('13:58(금)', 100, 40),
    word('상품명', 0, 60),
    word('수량', 200, 60),
    word('할인', 280, 60),
    word('금액', 360, 60),
    word('[포장] (ICE)아메리카노', 0, 80),
    word('1', 200, 80),
    word('0', 280, 80),
    word('2,000', 360, 80),
    word('샷 추가', 0, 100),
    word('1', 200, 100),
    word('0', 280, 100),
    word('600', 390, 100),
    word('부가세', 0, 120),
    word('237', 360, 120),
    word('합 계:', 0, 140),
    word('2,600', 360, 140),
  ].reverse();
  expect(
    clovaReceiptDraft({ images: [{ inferResult: 'SUCCESS', fields }] }),
  ).toEqual({
    storeName: '메가MGC커피 한국항공대역점',
    purchasedAt: '2026-11-06T04:58:00.000Z',
    total: 2600,
    items: [
      {
        menuName: '아이스 아메리카노 + 샷 추가',
        quantity: 1,
        unitPrice: 2600,
        caffeineMg: null,
      },
    ],
    scanned: true,
    verified: false,
  });
});

test('does not read a discount as the sale amount when the amount cell is missing', () => {
  const fields = [
    word('테스트 카페', 0, 0),
    word('상품명', 0, 20),
    word('수량', 200, 20),
    word('할인', 280, 20),
    word('금액', 360, 20),
    word('아메리카노', 0, 40),
    word('1', 200, 40),
    word('500', 280, 40),
  ];
  expect(clovaReceiptDraft({ images: [{ fields }] }).items).toEqual([]);
});

test('keeps unreadable purchase fields blank while preserving the OCR total', () => {
  const result = clovaReceiptDraft({
    images: [
      {
        fields: [
          { inferText: '2026-02-30 13:58', lineBreak: true },
          { inferText: '합 계:', lineBreak: true },
          { inferText: '2,600', lineBreak: true },
        ],
      },
    ],
  });
  expect(result).toMatchObject({ total: 2600, items: [], purchasedAt: '' });
  expect(receiptDraftToForm(result).purchasedAt).toBe('');
});

test('keeps free items and does not use a product row as the store name', () => {
  const fields = [
    word('STARBUCKS', 0, 0),
    word('상품명', 0, 20),
    word('수량', 200, 20),
    word('금액', 360, 20),
    word('카페라떼', 0, 40),
    word('1', 200, 40),
    word('2,000', 360, 40),
    word('무료 아메리카노', 0, 60),
    word('1', 200, 60),
    word('0', 360, 60),
  ];
  const result = clovaReceiptDraft({ images: [{ fields }] });
  expect(result.storeName).toBe('');
  expect(result.total).toBeNull();
  expect(result.items).toMatchObject([
    { menuName: '카페라떼', quantity: 1, unitPrice: 2000 },
    { menuName: '무료 아메리카노', quantity: 1, unitPrice: 0 },
  ]);
  expect(receiptDraftToForm(result).items[1].amount).toBe('0');
});

test('prefers an explicit zero payment over the item subtotal', () => {
  const fields = [
    word('테스트 카페', 0, 0),
    word('합계 2,000', 0, 20),
    word('결제금액 0원', 0, 40),
  ];
  expect(clovaReceiptDraft({ images: [{ fields }] }).total).toBe(0);
});

test('rejects a failed OCR result', () => {
  expect(() =>
    clovaReceiptDraft({ images: [{ inferResult: 'FAILURE', fields: [] }] }),
  ).toThrow();
});
