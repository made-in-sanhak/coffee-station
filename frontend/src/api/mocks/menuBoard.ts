import type {
  MenuBoardScanResult,
  MenuBulkItem,
  MenuDiffResult,
  MenuBoardUploadTicket,
} from '../../types/menuBoard';

// 개발용 가짜 메뉴판 인식 결과 (Figma 14-4 예시와 같음)
export function mockMenuBoardScan(): MenuBoardScanResult {
  return {
    items: [
      { name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', price: 2000, confidence: 0.97 },
      { name: '카페라떼', category: 'COFFEE', size: 'Regular', price: 2900, confidence: 0.62, note: '가격 글자가 흐려요' },
      { name: '바닐라라떼', category: 'COFFEE', size: 'Regular', price: 3400, confidence: 0.95 },
      { name: '콜드브루', category: 'COFFEE', size: 'Regular', price: 3500, confidence: 0.93 },
      { name: '디카페인 아메리카노', category: 'DECAF', size: 'Regular', price: 2500, confidence: 0.91 },
      { name: '자몽에이드', category: 'BEVERAGE', size: 'Regular', price: 3800, confidence: 0.7, note: '3,600원일 수도 있어요' },
      { name: '캐모마일티', category: 'TEA', size: 'Regular', price: 3000, confidence: 0.9 },
    ],
  };
}

// 개발용 가짜 변경 사항 (Figma 14-8 예시와 같음)
export function mockMenuBoardDiff(): MenuDiffResult {
  return {
    changes: [
      { kind: 'PRICE_CHANGED', menuId: 'mock-2', name: '카페라떼', category: 'COFFEE', size: 'Regular', previousPrice: 2900, price: 3000 },
      { kind: 'PRICE_CHANGED', menuId: 'mock-3', name: '바닐라라떼', category: 'COFFEE', size: 'Regular', previousPrice: 3400, price: 3600 },
      { kind: 'NEW', menuId: null, name: '단호박 라떼', category: 'BEVERAGE', size: 'Regular', previousPrice: null, price: 3800 },
      { kind: 'MISSING', menuId: 'mock-7', name: '캐모마일티', category: 'TEA', size: 'Regular', previousPrice: 3000, price: 3000 },
    ],
    unchanged: [
      { menuId: 'mock-1', name: '아이스 아메리카노' },
      { menuId: 'mock-4', name: '콜드브루' },
      { menuId: 'mock-5', name: '디카페인 아메리카노' },
      { menuId: 'mock-6', name: '자몽에이드' },
    ],
  };
}

let uploadCount = 0;
export function mockUploadTicket(): MenuBoardUploadTicket {
  uploadCount += 1;
  return { uploadUrl: 'mock://upload', imageKey: `mock/menu-board/${uploadCount}.jpg` };
}

export function mockRegisterMenus(items: MenuBulkItem[]) {
  return { count: items.length };
}
