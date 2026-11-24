import {
  createManualDraft,
  validateReceiptForm,
  parseReceiptForm,
  receiptDraftToForm,
  receiptPurchaseInputs,
} from './receiptForm';

test('manual receipt starts without fabricated store, menu, amount or caffeine', () => {
  const draft = createManualDraft(new Date(2026, 9, 13, 8, 42));
  expect(draft.storeName).toBe('');
  expect(draft.purchasedAt).toBe('2026-10-13 08:42');
  expect(draft.items[0]).toMatchObject({
    name: '',
    amount: '',
    caffeineMg: '',
  });
});

test('unchanged OCR timestamp retains seconds and milliseconds for server verification', () => {
  const draft = {
    id: 'receipt-id',
    storeName: '테스트 카페',
    purchasedAt: '2026-10-13T08:42:17.321Z',
    total: 2000,
    verified: true,
    items: [
      {
        menuName: '아메리카노',
        quantity: 1,
        unitPrice: 2000,
        caffeineMg: null,
      },
    ],
  };
  const form = receiptDraftToForm(draft);
  expect(receiptPurchaseInputs(form, draft)[0].purchasedAt).toBe(
    draft.purchasedAt,
  );
  form.purchasedAt = '2026-10-14 09:12';
  expect(receiptPurchaseInputs(form, draft)[0].purchasedAt).not.toBe(
    draft.purchasedAt,
  );
});

test('amount validation matches supported server limits and menu caffeine data is not validated', () => {
  const form = createManualDraft();
  form.storeName = '테스트 카페';
  form.items[0] = {
    name: '아메리카노',
    size: '',
    quantity: '3',
    amount: '2000',
    caffeineMg: '',
    matched: false,
  };
  expect(validateReceiptForm(form)).toContain('원 단위');
  form.items[0].quantity = '1';
  form.items[0].caffeineMg = '3001';
  expect(validateReceiptForm(form)).toBeNull();
  expect(parseReceiptForm(form).items[0].caffeineMg).toBeUndefined();
});

test('invalid calendar dates and negative money cannot be saved', () => {
  const draft = createManualDraft(new Date(2026, 9, 13));
  draft.storeName = '테스트 카페';
  draft.purchasedAt = '2026-02-30 08:42';
  draft.items[0] = {
    name: '아메리카노',
    size: 'Large',
    quantity: '1',
    amount: '-2000',
    caffeineMg: '',
    matched: false,
  };
  expect(validateReceiptForm(draft)).toContain('결제 일시');
  draft.purchasedAt = '2026-10-13 08:42';
  expect(validateReceiptForm(draft)).toContain('금액');
});

test('menu caffeine data passes through without a caffeine total', () => {
  const draft = createManualDraft(new Date(2026, 9, 13, 8, 42));
  draft.storeName = '테스트 카페';
  draft.items = [
    {
      name: '아메리카노',
      size: 'Large',
      quantity: '2',
      amount: '4,000',
      caffeineMg: '150',
      matched: true,
    },
    {
      name: '오늘의 음료',
      size: '',
      quantity: '1',
      amount: '3,000',
      caffeineMg: '',
      matched: false,
    },
  ];
  expect(validateReceiptForm(draft)).toBeNull();
  const parsed = parseReceiptForm(draft);
  expect(parsed).toMatchObject({ totalAmount: 7000, totalCups: 3 });
  expect(parsed).not.toHaveProperty('caffeineMg');
  expect(parsed.items.map(item => item.caffeineMg)).toEqual([150, undefined]);
});
