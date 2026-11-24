import type {
  MenuBoardCategory,
  MenuBoardScanItem,
  MenuBoardTemperature,
  MenuBulkItem,
  MenuDiffItem,
  MenuDiffResult,
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

export const MENU_TEMPERATURES: Array<{ code: MenuBoardTemperature; label: string }> = [
  { code: 'HOT', label: 'HOT' },
  { code: 'ICE', label: 'ICE' },
  { code: null, label: '미확인' },
];
export const temperatureLabel = (value: MenuBoardTemperature | undefined) =>
  value === 'HOT' || value === 'ICE' ? value : '온도 미확인';
export const UNKNOWN_TEMPERATURE_MESSAGE = '온도를 확인할 수 없어요. HOT 또는 ICE를 선택해 주세요.';

export const DEFAULT_MENU_SIZE = 'Regular';

// 메뉴 옵션 하나를 가리키는 키: 메뉴명 + 사이즈 + 온도
// 같은 Regular 아메리카노라도 HOT·ICE 는 서로 다른 옵션입니다.
export function menuOptionKey(item: {
  name: string;
  size?: string | null;
  temperature?: MenuBoardTemperature;
}) {
  const name = item.name.replace(/\s/g, '').toLowerCase();
  const size = (item.size?.trim() || DEFAULT_MENU_SIZE).toLowerCase();
  return `${name}|${size}|${item.temperature ?? '?'}`;
}
// 온도를 뺀 키 (온도 미확인 항목이 기존 온도별 옵션을 덮어쓰지 않게 막을 때 씁니다)
const nameSizeKey = (item: { name: string; size?: string | null }) =>
  menuOptionKey({ ...item, temperature: null }).replace(/\|\?$/, '');

// 인식 결과 확인 화면의 한 줄
export interface ReviewItem {
  key: string;
  name: string;
  category: MenuBoardCategory | null;
  size: string;
  temperature: MenuBoardTemperature;
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
    temperature: item.temperature === 'HOT' || item.temperature === 'ICE' ? item.temperature : null,
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
    temperature: null,
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
    unknownTemperature: items.filter(item => item.temperature === null).length,
    included: items.filter(item => item.include).length,
  };
}

const parsePrice = (value: string) => {
  const price = Number(digitsOnly(value));
  return value.trim() !== '' && Number.isSafeInteger(price) ? price : null;
};

const optionLabel = (item: Pick<ReviewItem, 'name' | 'size' | 'temperature'>) =>
  `${item.name.trim()} ${item.size.trim() || DEFAULT_MENU_SIZE} ${temperatureLabel(item.temperature)}`;

// 등록할(켜 둔) 메뉴가 올바른지 확인합니다. 문제가 없으면 null.
// 온도 미확인은 막지 않습니다. (미확인으로 등록하고, 기존 옵션을 덮어쓰지 않음)
export function validateReviewItems(items: ReviewItem[]): string | null {
  const included = items.filter(item => item.include);
  if (included.length === 0) return '등록할 메뉴를 한 개 이상 켜 주세요.';
  const seen = new Set<string>();
  for (const item of included) {
    const label = item.name.trim() || '이름 없는 메뉴';
    if (!item.name.trim()) return '메뉴 이름을 입력해 주세요.';
    if (!item.category) return `${label}의 카테고리를 골라 주세요.`;
    const price = parsePrice(item.price);
    if (price === null || price <= 0) return `${label}의 가격을 입력해 주세요.`;
    if (price > 1_000_000) return `${label}의 가격은 1,000,000원까지 입력할 수 있어요.`;
    const key = menuOptionKey(item);
    if (seen.has(key)) return `같은 메뉴가 두 번 있어요: ${optionLabel(item)}. 하나를 끄거나 온도·사이즈를 확인해 주세요.`;
    seen.add(key);
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
      temperature: item.temperature,
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

// 등록된 메뉴 옵션 (변경 비교용)
export interface ExistingMenuOption {
  menuId: string;
  name: string;
  category: MenuBoardCategory | null;
  size: string | null;
  temperature: MenuBoardTemperature;
  price: number;
}

// 새로 찍은 메뉴판과 등록된 메뉴를 메뉴명·사이즈·온도로 비교합니다.
// - 같은 옵션인데 가격이 다르면 PRICE_CHANGED, 같으면 그대로
// - 등록에 없는 옵션은 NEW
// - 메뉴판에 없는 등록 옵션은 MISSING
// - 메뉴판에서 온도를 확인하지 못한 항목은 기존 HOT/ICE 옵션과 맞추지 않습니다(덮어쓰지 않음).
//   같은 메뉴명·사이즈의 기존 옵션이 있으면 그 옵션들은 MISSING 으로 보지 않고 그대로 둡니다.
export function diffMenuOptions(
  existing: ExistingMenuOption[],
  scanned: MenuBoardScanItem[],
): MenuDiffResult {
  const byKey = new Map(existing.map(option => [menuOptionKey(option), option]));
  const matched = new Set<string>();
  const protectedNameSize = new Set<string>();
  const changes: MenuDiffItem[] = [];
  for (const item of scanned) {
    const temperature = item.temperature === 'HOT' || item.temperature === 'ICE' ? item.temperature : null;
    const scan = { ...item, temperature };
    const current = temperature === null ? undefined : byKey.get(menuOptionKey(scan));
    if (temperature === null && existing.some(option => nameSizeKey(option) === nameSizeKey(scan) && option.temperature !== null)) {
      protectedNameSize.add(nameSizeKey(scan));
    }
    if (current) {
      matched.add(current.menuId);
      if (item.price !== null && item.price !== current.price) {
        changes.push({
          kind: 'PRICE_CHANGED',
          menuId: current.menuId,
          name: current.name,
          category: current.category,
          size: current.size,
          temperature: current.temperature,
          previousPrice: current.price,
          price: item.price,
        });
      }
      continue;
    }
    const sameUnknown = temperature === null ? byKey.get(menuOptionKey(scan)) : undefined;
    if (sameUnknown) {
      // 둘 다 온도 미확인인 같은 메뉴: 그대로 비교합니다.
      matched.add(sameUnknown.menuId);
      if (item.price !== null && item.price !== sameUnknown.price) {
        changes.push({ kind: 'PRICE_CHANGED', menuId: sameUnknown.menuId, name: sameUnknown.name, category: sameUnknown.category, size: sameUnknown.size, temperature: null, previousPrice: sameUnknown.price, price: item.price });
      }
      continue;
    }
    changes.push({
      kind: 'NEW',
      menuId: null,
      name: item.name.trim(),
      category: item.category,
      size: item.size?.trim() || DEFAULT_MENU_SIZE,
      temperature,
      previousPrice: null,
      price: item.price,
    });
  }
  const unchanged: MenuDiffResult['unchanged'] = [];
  for (const option of existing) {
    if (matched.has(option.menuId) || protectedNameSize.has(nameSizeKey(option))) {
      if (!changes.some(change => change.menuId === option.menuId)) {
        unchanged.push({ menuId: option.menuId, name: option.name, size: option.size, temperature: option.temperature });
      }
      continue;
    }
    changes.push({
      kind: 'MISSING',
      menuId: option.menuId,
      name: option.name,
      category: option.category,
      size: option.size,
      temperature: option.temperature,
      previousPrice: option.price,
      price: option.price,
    });
  }
  return { changes, unchanged };
}

// 변경 사항 확인: 가격 변경·새 메뉴는 기본으로 켜고, "메뉴판에 없음"과 온도를 모르는 새 메뉴는 기본으로 끕니다.
export const defaultDiffEnabled = (item: Pick<MenuDiffItem, 'kind' | 'temperature'>) =>
  item.kind === 'PRICE_CHANGED' || (item.kind === 'NEW' && item.temperature !== null);

// 새 메뉴의 온도를 골랐을 때, 이미 등록된 옵션(그대로인 메뉴·다른 변경)과 겹치면 안내 문구를 돌려줍니다.
export function newOptionConflict(
  item: Pick<MenuDiffItem, 'name' | 'size' | 'temperature'>,
  diff: MenuDiffResult,
  self: MenuDiffItem,
): string | null {
  if (item.temperature === null) return null;
  const key = menuOptionKey(item);
  const taken =
    diff.unchanged.some(option => menuOptionKey({ name: option.name, size: option.size, temperature: option.temperature ?? null }) === key) ||
    diff.changes.some(change => change !== self && change.kind !== 'NEW' && menuOptionKey(change) === key);
  return taken ? `${item.name} ${temperatureLabel(item.temperature)}는 이미 등록된 옵션이에요. 가격 변경은 메뉴 관리에서 해 주세요.` : null;
}

export function diffSummary(changes: MenuDiffItem[]) {
  return {
    priceChanged: changes.filter(item => item.kind === 'PRICE_CHANGED').length,
    added: changes.filter(item => item.kind === 'NEW').length,
    missing: changes.filter(item => item.kind === 'MISSING').length,
  };
}
