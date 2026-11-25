import type { PurchaseInput, ReceiptDraft } from '../../app/domain';
export interface ReceiptFormItem {
  name: string;
  size: string;
  quantity: string;
  amount: string;
  caffeineMg: string;
  matched: boolean;
}

export interface ReceiptForm {
  storeName: string;
  purchasedAt: string;
  items: ReceiptFormItem[];
}

const pad = (value: number) => String(value).padStart(2, '0');

export function createManualDraft(now = new Date()): ReceiptForm {
  return {
    storeName: '',
    purchasedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    items: [
      {
        name: '',
        size: '',
        quantity: '1',
        amount: '',
        caffeineMg: '',
        matched: false,
      },
    ],
  };
}

export function receiptDraftToForm(draft: ReceiptDraft): ReceiptForm {
  const base = createManualDraft(draft.purchasedAt ? new Date(draft.purchasedAt) : undefined);
  return {
    ...base,
    purchasedAt: draft.purchasedAt ? base.purchasedAt : '',
    storeName: draft.storeName,
    items: draft.items.length
      ? draft.items.map(item => ({
          name: item.menuName,
          size: '',
          quantity: String(item.quantity),
          amount:
            item.menuName || item.unitPrice
              ? String(item.unitPrice * item.quantity)
              : '',
          caffeineMg: item.caffeineMg === null ? '' : String(item.caffeineMg),
          matched: !!item.matchedMenuId,
        }))
      : base.items,
  };
}

export function receiptPurchaseInputs(
  form: ReceiptForm,
  draft: ReceiptDraft,
  local = false,
): PurchaseInput[] {
  const parsed = parseReceiptForm(form);
  const purchasedAt =
    !local &&
    draft.id &&
    form.purchasedAt === receiptDraftToForm(draft).purchasedAt
      ? draft.purchasedAt
      : parsed.purchasedAt;
  return parsed.items.map(item => ({
    cafeName: parsed.storeName,
    menuName: item.name,
    quantity: item.quantity,
    unitPrice: item.amount / item.quantity,
    purchasedAt,
    caffeineMg: item.caffeineMg ?? null,
    source: !local && draft.id ? 'ocr' : 'manual',
    ...(!local && draft.id ? { receiptId: draft.id } : {}),
  }));
}

function parsePaymentDate(value: string) {
  const match = /^(\d{4})[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number);
  const date = new Date(y, m - 1, d, h, min);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    date.getHours() !== h ||
    date.getMinutes() !== min
  )
    return null;
  return date;
}

const numeric = (value: string) => Number(value.replace(/,/g, '').trim());
const isMoney = (value: string) =>
  /^\d[\d,]*$/.test(value.trim()) &&
  Number.isSafeInteger(numeric(value)) &&
  numeric(value) >= 0;

export function validateReceiptForm(form: ReceiptForm): string | null {
  if (!form.storeName.trim()) return '매장명을 입력해 주세요.';
  if (!parsePaymentDate(form.purchasedAt))
    return '결제 일시를 YYYY-MM-DD HH:mm 형식으로 확인해 주세요.';
  if (form.items.length === 0) return '구매 메뉴를 한 개 이상 입력해 주세요.';
  if (form.items.length > 50) return '구매 메뉴는 50개까지 입력할 수 있어요.';
  for (const [index, item] of form.items.entries()) {
    const prefix = `${index + 1}번째 메뉴`;
    if (!item.name.trim()) return `${prefix} 이름을 입력해 주세요.`;
    if (
      !/^\d+$/.test(item.quantity.trim()) ||
      numeric(item.quantity) < 1 ||
      numeric(item.quantity) > 100
    )
      return `${prefix} 수량을 1~100잔으로 입력해 주세요.`;
    if (!isMoney(item.amount))
      return `${prefix} 결제 금액을 0 이상의 원 단위로 입력해 주세요.`;
    if (!Number.isInteger(numeric(item.amount) / numeric(item.quantity)))
      return `${prefix} 금액과 수량을 확인해 주세요. 한 잔의 가격은 원 단위여야 해요.`;
    if (numeric(item.amount) / numeric(item.quantity) > 1000000)
      return `${prefix} 한 잔의 가격은 1,000,000원까지 입력할 수 있어요.`;
  }
  return null;
}

export function parseReceiptForm(form: ReceiptForm) {
  const error = validateReceiptForm(form);
  if (error) throw new Error(error);
  const items = form.items.map(item => ({
    name: item.name.trim(),
    size: item.size.trim() || undefined,
    quantity: numeric(item.quantity),
    amount: numeric(item.amount),
    // 매칭된 메뉴의 caffeineMg 는 메뉴 데이터로만 전달합니다. 형식이 맞지 않으면 미등록으로 둡니다.
    caffeineMg:
      /^\d+(\.\d+)?$/.test(item.caffeineMg.trim()) &&
      numeric(item.caffeineMg) <= 3000
        ? numeric(item.caffeineMg)
        : undefined,
    matched: item.matched,
  }));
  return {
    storeName: form.storeName.trim(),
    purchasedAt: parsePaymentDate(form.purchasedAt)!.toISOString(),
    items,
    totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    totalCups: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
