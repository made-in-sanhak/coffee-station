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
    word('600', 360, 100),
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

test('rejects a failed OCR result', () => {
  expect(() =>
    clovaReceiptDraft({ images: [{ inferResult: 'FAILURE', fields: [] }] }),
  ).toThrow();
});
