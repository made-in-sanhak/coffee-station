import type {
  MenuBoardCategory,
  MenuBoardScanItem,
  MenuBulkItem,
  MenuDiffItem,
} from '../../../types/menuBoard';

// OCR 신뢰도가 이 값보다 낮으면 "확인 필요"로 표시합니다. (0~1)
export const OCR_CONFIDENCE_THRESHOLD = 0.85;

export const MENU_BOARD_CATEGORIES: Array<{ code: MenuBoardCategory; label: string }> = [
  { code: 'COFFEE', label: '커피' },
  { code: 'DECAF', label: '디카페인' },
  { code: 'BEVERAGE', label: '에이드·음료' },
  { code: 'TEA', label: '차' },
];
export const categoryLabel = (code: MenuBoardCategory | null | undefined) =>
  MENU_BOARD_CATEGORIES.find(item => item.code === code)?.label ?? '분류 없음';

export const DEFAULT_MENU_SIZE = 'Regular';

// 인식 결과 확인 화면의 한 줄
export interface ReviewItem {
  key: string;
  name: string;
  category: MenuBoardCategory | null;
  size: string;
  price: string; // 입력칸 값 (숫자만)
  include: boolean;
  confidence: number;
  note: string | null;
  // 점주가 직접 고친 항목은 신뢰도와 상관없이 확인된 것으로 봅니다.
  checked: boolean;
}

export const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

export function toReviewItems(items: MenuBoardScanItem[]): ReviewItem[] {
  return items.map((item, index) => ({
    key: `scan-${index}`,
    name: item.name.trim(),
    category: item.category,
    size: item.size?.trim() || DEFAULT_MENU_SIZE,
    price: item.price === null ? '' : String(item.price),
    include: true,
    confidence: item.confidence,
    note: item.note ?? null,
    checked: false,
  }));
}

export function blankReviewItem(key: string): ReviewItem {
  return {
    key,
    name: '',
    category: null,
    size: DEFAULT_MENU_SIZE,
    price: '',
    include: true,
    confidence: 1,
    note: null,
    checked: true,
  };
}

export const needsCheck = (item: Pick<ReviewItem, 'confidence' | 'checked'>) =>
  !item.checked && item.confidence < OCR_CONFIDENCE_THRESHOLD;

export function reviewSummary(items: ReviewItem[]) {
  return {
    total: items.length,
    needsCheck: items.filter(needsCheck).length,
    included: items.filter(item => item.include).length,
  };
}

const parsePrice = (value: string) => {
  const price = Number(digitsOnly(value));
  return value.trim() !== '' && Number.isSafeInteger(price) ? price : null;
};

// 등록할(켜 둔) 메뉴가 올바른지 확인합니다. 문제가 없으면 null.
export function validateReviewItems(items: ReviewItem[]): string | null {
  const included = items.filter(item => item.include);
  if (included.length === 0) return '등록할 메뉴를 한 개 이상 켜 주세요.';
  for (const item of included) {
    const label = item.name.trim() || '이름 없는 메뉴';
    if (!item.name.trim()) return '메뉴 이름을 입력해 주세요.';
    if (!item.category) return `${label}의 카테고리를 골라 주세요.`;
    const price = parsePrice(item.price);
    if (price === null || price <= 0) return `${label}의 가격을 입력해 주세요.`;
    if (price > 1_000_000) return `${label}의 가격은 1,000,000원까지 입력할 수 있어요.`;
  }
  return null;
}

export function toBulkItems(items: ReviewItem[]): MenuBulkItem[] {
  return items
    .filter(item => item.include)
    .map(item => ({
      name: item.name.trim(),
      category: item.category!,
      size: item.size.trim() || DEFAULT_MENU_SIZE,
      price: parsePrice(item.price)!,
    }));
}

export function countByCategory(items: Array<{ category: MenuBoardCategory }>) {
  const counts: Record<MenuBoardCategory, number> = { COFFEE: 0, DECAF: 0, BEVERAGE: 0, TEA: 0 };
  items.forEach(item => {
    counts[item.category] += 1;
  });
  return counts;
}

// 변경 사항 확인: 가격 변경·새 메뉴는 기본으로 켜고, "메뉴판에 없음"은 기본으로 끕니다.
export const defaultDiffEnabled = (item: Pick<MenuDiffItem, 'kind'>) => item.kind !== 'MISSING';

export function diffSummary(changes: MenuDiffItem[]) {
  return {
    priceChanged: changes.filter(item => item.kind === 'PRICE_CHANGED').length,
    added: changes.filter(item => item.kind === 'NEW').length,
    missing: changes.filter(item => item.kind === 'MISSING').length,
  };
}
