import type {
  MenuBoardScanResult,
  MenuBulkItem,
  MenuDiffResult,
  MenuBoardUploadTicket,
} from '../../types/menuBoard';
import {
  diffMenuOptions,
  type ExistingMenuOption,
} from '../../screens/owner/menuBoard/menuBoardLogic';

// 개발용 가짜 메뉴판 인식 결과 (Figma 14-4 예시 + 온도). 바닐라라떼는 온도를 읽지 못한 경우입니다.
export function mockMenuBoardScan(): MenuBoardScanResult {
  return {
    items: [
      { name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2000, confidence: 0.97 },
      { name: '카페라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2900, confidence: 0.62, note: '가격 글자가 흐려요' },
      { name: '바닐라라떼', category: 'COFFEE', size: 'Regular', temperature: null, price: 3400, confidence: 0.95 },
      { name: '콜드브루', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3500, confidence: 0.93 },
      { name: '디카페인 아메리카노', category: 'DECAF', size: 'Regular', temperature: 'HOT', price: 2500, confidence: 0.91 },
      { name: '자몽에이드', category: 'BEVERAGE', size: 'Regular', temperature: 'ICE', price: 3800, confidence: 0.7, note: '3,600원일 수도 있어요' },
      { name: '캐모마일티', category: 'TEA', size: 'Regular', temperature: 'HOT', price: 3000, confidence: 0.9 },
    ],
  };
}

// 개발용 등록된 메뉴와 바뀐 메뉴판 (비교 결과가 Figma 14-8 예시와 같음)
const MOCK_REGISTERED: ExistingMenuOption[] = [
  { menuId: 'mock-1', name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2000 },
  { menuId: 'mock-2', name: '카페라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2900 },
  { menuId: 'mock-3', name: '바닐라라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3400 },
  { menuId: 'mock-4', name: '콜드브루', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3500 },
  { menuId: 'mock-5', name: '디카페인 아메리카노', category: 'DECAF', size: 'Regular', temperature: 'HOT', price: 2500 },
  { menuId: 'mock-6', name: '자몽에이드', category: 'BEVERAGE', size: 'Regular', temperature: 'ICE', price: 3800 },
  { menuId: 'mock-7', name: '캐모마일티', category: 'TEA', size: 'Regular', temperature: 'HOT', price: 3000 },
];
const MOCK_UPDATED_BOARD: MenuBoardScanResult['items'] = [
  { name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2000, confidence: 0.97 },
  { name: '카페라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3000, confidence: 0.95 },
  { name: '바닐라라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3600, confidence: 0.94 },
  { name: '콜드브루', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3500, confidence: 0.93 },
  { name: '디카페인 아메리카노', category: 'DECAF', size: 'Regular', temperature: 'HOT', price: 2500, confidence: 0.91 },
  { name: '자몽에이드', category: 'BEVERAGE', size: 'Regular', temperature: 'ICE', price: 3800, confidence: 0.9 },
  { name: '단호박 라떼', category: 'BEVERAGE', size: 'Regular', temperature: 'HOT', price: 3800, confidence: 0.92 },
];

export function mockMenuBoardDiff(): MenuDiffResult {
  return diffMenuOptions(MOCK_REGISTERED, MOCK_UPDATED_BOARD);
}

let uploadCount = 0;
export function mockUploadTicket(): MenuBoardUploadTicket {
  uploadCount += 1;
  return { uploadUrl: 'mock://upload', imageKey: `mock/menu-board/${uploadCount}.jpg` };
}

export function mockRegisterMenus(items: MenuBulkItem[]) {
  return { count: items.length };
}
