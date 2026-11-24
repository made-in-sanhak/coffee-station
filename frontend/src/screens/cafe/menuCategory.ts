import type { Menu } from '../../app/domain';

export const MENU_CATEGORIES = ['커피', '디카페인', '에이드·음료', '차'] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

// 서버 category 값 → 화면 탭. 알 수 없는 값이면 이름으로 추측합니다.
const CATEGORY_ALIASES: Record<string, MenuCategory> = {
  COFFEE: '커피',
  커피: '커피',
  DECAF: '디카페인',
  DECAFFEINE: '디카페인',
  DECAFFEINATED: '디카페인',
  디카페인: '디카페인',
  BEVERAGE: '에이드·음료',
  ADE: '에이드·음료',
  DRINK: '에이드·음료',
  NON_COFFEE: '에이드·음료',
  'NON-COFFEE': '에이드·음료',
  음료: '에이드·음료',
  에이드: '에이드·음료',
  '에이드·음료': '에이드·음료',
  '에이드/음료': '에이드·음료',
  TEA: '차',
  차: '차',
  티: '차',
};

const COFFEE_NAME =
  /아메리카노|라떼|라테|카페모카|모카|카푸치노|마키아[또토]|에스프레소|콜드브루|카페오레|아인슈페너|플랫화이트|더치|coffee|americano|latte|espresso/;
const TEA_NAME =
  /밀크티|아이스티|녹차|홍차|허브티|캐모마일|페퍼민트|유자차|레몬티|얼그레이|루이보스|자몽차|생강차|tea/;
const DRINK_NAME =
  /에이드|스무디|주스|쥬스|초코|프라페|쉐이크|요거트|우유|소다|블렌디드|ade|smoothie|juice/;

// 우선순위: 서버 category → 이름 추측. 추측이 안 되면 '커피'로 보내지 않고 '에이드·음료'로 보냅니다.
export function getMenuCategory(
  menu: Pick<Menu, 'name' | 'caffeineMg'> & { category?: string | null },
): MenuCategory {
  const alias = CATEGORY_ALIASES[(menu.category ?? '').trim().toUpperCase()];
  if (alias) return alias;

  const name = menu.name.toLowerCase().replace(/\s/g, '');
  if (/디카페인|decaf/.test(name)) return '디카페인';
  // 녹차라떼·밀크티처럼 '라떼'가 붙은 차 음료를 커피보다 먼저 거릅니다.
  if (TEA_NAME.test(name) || /(녹차|말차|홍차|티)라[떼테]/.test(name)) return '차';
  if (/(초코|고구마|딸기|곡물|토피넛|우유)라[떼테]/.test(name)) return '에이드·음료';
  if (DRINK_NAME.test(name) && !COFFEE_NAME.test(name)) return '에이드·음료';
  if (COFFEE_NAME.test(name)) {
    // 커피 이름인데 카페인이 거의 없으면 디카페인 메뉴로 봅니다.
    const mg = menu.caffeineMg;
    return typeof mg === 'number' && Number.isFinite(mg) && mg >= 0 && mg <= 10
      ? '디카페인'
      : '커피';
  }
  if (DRINK_NAME.test(name)) return '에이드·음료';
  if (/차$/.test(name)) return '차';
  return '에이드·음료';
}

export function countMenusByCategory(menus: Parameters<typeof getMenuCategory>[0][]) {
  const counts: Record<MenuCategory, number> = { 커피: 0, 디카페인: 0, '에이드·음료': 0, 차: 0 };
  menus.forEach(menu => {
    counts[getMenuCategory(menu)] += 1;
  });
  return counts;
}

export const COLLAPSED_MENU_COUNT = 3;
