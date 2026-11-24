import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { mockMenuBoardDiff, mockMenuBoardScan } from '../src/api/mocks/menuBoard';
import { useMenuBoardStore } from '../src/store/menuBoardStore';
import {
  blankReviewItem,
  countByCategory,
  defaultDiffEnabled,
  diffItemMissing,
  diffMenuOptions,
  diffOptionConflict,
  diffSummary,
  needsCheck,
  validateDiffSelection,
  OCR_CONFIDENCE_THRESHOLD,
  reviewSummary,
  toBulkItems,
  toReviewItems,
  validateReviewItems,
} from '../src/screens/owner/menuBoard/menuBoardLogic';
import OwnerMenuOnboardingScreen from '../src/screens/owner/menuBoard/OwnerMenuOnboardingScreen';
import MenuBoardCaptureScreen from '../src/screens/owner/menuBoard/MenuBoardCaptureScreen';
import MenuBoardProcessingScreen from '../src/screens/owner/menuBoard/MenuBoardProcessingScreen';
import MenuBoardReviewScreen from '../src/screens/owner/menuBoard/MenuBoardReviewScreen';
import MenuRegisterDoneScreen from '../src/screens/owner/menuBoard/MenuRegisterDoneScreen';
import MenuBoardDiffScreen from '../src/screens/owner/menuBoard/MenuBoardDiffScreen';

const mockApi = {
  requestMenuBoardUpload: jest.fn(),
  uploadMenuBoardImage: jest.fn(),
  scanMenuBoard: jest.fn(),
  diffMenuBoard: jest.fn(),
  registerMenus: jest.fn(),
  applyMenuDiff: jest.fn(),
};
jest.mock('../src/api/endpoints/menuBoard', () => ({
  requestMenuBoardUpload: (...args: unknown[]) => mockApi.requestMenuBoardUpload(...args),
  uploadMenuBoardImage: (...args: unknown[]) => mockApi.uploadMenuBoardImage(...args),
  scanMenuBoard: (...args: unknown[]) => mockApi.scanMenuBoard(...args),
  diffMenuBoard: (...args: unknown[]) => mockApi.diffMenuBoard(...args),
  registerMenus: (...args: unknown[]) => mockApi.registerMenus(...args),
  applyMenuDiff: (...args: unknown[]) => mockApi.applyMenuDiff(...args),
}));
const mockPick = jest.fn();
jest.mock('../src/screens/owner/menuBoard/pickMenuBoardImage', () => ({
  pickMenuBoardImage: (camera: boolean) => mockPick(camera),
}));
jest.mock('../src/screens/owner/menuBoard/useNoBackUntilReset', () => ({
  useNoBackUntilReset: () => undefined,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

const cafe = { id: 'cafe-1', name: '메가MGC커피 OO역점', address: '서울 중구 세종대로 110' };
const image = { uri: 'file://board-1.jpg', type: 'image/jpeg', name: 'board-1.jpg' };
const nav = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
  dispatch: jest.fn(),
  canGoBack: () => true,
});
const route = (name: string, params?: unknown) => ({ key: name, name, params });
const find = (tree: Renderer.ReactTestRenderer, testID: string, prop = 'onPress') =>
  tree.root.findAll(node => node.props.testID === testID && node.props[prop] !== undefined)[0];
const texts = (tree: Renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(node => [].concat(node.props.children).join(''));

beforeEach(() => {
  Object.values(mockApi).forEach(fn => fn.mockReset());
  mockPick.mockReset();
  useMenuBoardStore.getState().start('register', cafe);
});

test('low OCR confidence needs a check until the owner edits it, and only switched-on menus are registered', () => {
  const items = toReviewItems(mockMenuBoardScan().items);
  expect(OCR_CONFIDENCE_THRESHOLD).toBe(0.85);
  expect(items.filter(needsCheck).map(item => item.name)).toEqual(['카페라떼', '자몽에이드']);
  expect(reviewSummary(items)).toEqual({ total: 7, needsCheck: 2, unknownTemperature: 1, included: 7 });
  items[1] = { ...items[1], checked: true };
  items[6] = { ...items[6], include: false };
  expect(reviewSummary(items)).toEqual({ total: 7, needsCheck: 1, unknownTemperature: 1, included: 6 });
  expect(validateReviewItems(items)).toBeNull();
  const bulk = toBulkItems(items);
  expect(bulk).toHaveLength(6);
  expect(bulk[0]).toEqual({ name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 2000 });
  // 온도를 읽지 못한 바닐라라떼는 임의로 정하지 않고 미확인(null)으로 보냅니다.
  expect(bulk[2]).toMatchObject({ name: '바닐라라떼', temperature: null });
  expect(countByCategory(bulk)).toEqual({ COFFEE: 4, DECAF: 1, BEVERAGE: 1, TEA: 0 });
});

test('review validation explains missing names, categories and prices', () => {
  const blank = blankReviewItem('a');
  expect(validateReviewItems([])).toContain('한 개 이상');
  expect(validateReviewItems([blank])).toBe('메뉴 이름을 입력해 주세요.');
  expect(validateReviewItems([{ ...blank, name: '라떼' }])).toContain('카테고리');
  expect(validateReviewItems([{ ...blank, name: '라떼', category: 'COFFEE' }])).toContain('가격');
  expect(validateReviewItems([{ ...blank, name: '라떼', category: 'COFFEE', price: '3000' }])).toBeNull();
});

test('diff toggles default on for price changes and new menus, off for menus missing from the board', () => {
  const { changes } = mockMenuBoardDiff();
  expect(changes.map(defaultDiffEnabled)).toEqual([true, true, true, false]);
  expect(diffSummary(changes)).toEqual({ priceChanged: 2, added: 1, missing: 1 });
  expect(changes.map(change => change.temperature)).toEqual(['ICE', 'ICE', 'HOT', 'HOT']);
});

const americano = [
  { menuId: 'h', name: '아메리카노', category: 'COFFEE' as const, size: 'Regular', temperature: 'HOT' as const, price: 1500 },
  { menuId: 'i', name: '아메리카노', category: 'COFFEE' as const, size: 'Regular', temperature: 'ICE' as const, price: 2000 },
];
const scan = (temperature: 'HOT' | 'ICE' | null, price: number) => ({
  name: '아메리카노', category: 'COFFEE' as const, size: 'Regular', temperature, price, confidence: 0.95,
});

test('HOT and ICE prices of the same menu stay separate and only the changed option is updated', () => {
  const diff = diffMenuOptions(americano, [scan('HOT', 1500), scan('ICE', 2200)]);
  expect(diff.changes).toEqual([
    { kind: 'PRICE_CHANGED', menuId: 'i', name: '아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'ICE', previousPrice: 2000, price: 2200 },
  ]);
  expect(diff.unchanged).toEqual([{ menuId: 'h', name: '아메리카노', size: 'Regular', temperature: 'HOT' }]);
});

test('a menu whose temperature could not be read never overwrites or retires the HOT and ICE options', () => {
  const diff = diffMenuOptions(americano, [scan(null, 1800)]);
  expect(diff.changes).toHaveLength(1);
  expect(diff.changes[0]).toMatchObject({ kind: 'NEW', menuId: null, temperature: null, price: 1800 });
  expect(defaultDiffEnabled(diff.changes[0])).toBe(false);
  expect(diff.unchanged.map(option => option.menuId)).toEqual(['h', 'i']);
  // 점주가 이미 있는 옵션의 온도를 고르면 새 옵션으로 만들지 않고 막습니다.
  const picked = [{ ...diff.changes[0], temperature: 'ICE' as const }];
  expect(diffOptionConflict(0, picked, [true], diff.unchanged)).toContain('이미 등록된 옵션');
  expect(diffOptionConflict(0, [{ ...picked[0], name: '바닐라라떼' }], [true], diff.unchanged)).toBeNull();
});

test('the same menu, size and temperature cannot be registered twice but HOT and ICE can', () => {
  const base = { ...blankReviewItem('a'), name: '아메리카노', category: 'COFFEE' as const, price: '1500' };
  expect(validateReviewItems([{ ...base, temperature: 'HOT' }, { ...base, key: 'b', temperature: 'ICE', price: '2000' }])).toBeNull();
  expect(validateReviewItems([{ ...base, temperature: 'ICE' }, { ...base, key: 'b', temperature: 'ICE' }])).toContain('같은 메뉴가 두 번');
});

test('first registration onboarding picks a photo into the capture screen or starts manual entry', async () => {
  const navigation = nav();
  mockPick.mockResolvedValueOnce(image);
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<OwnerMenuOnboardingScreen {...({ navigation, route: route('OwnerMenuOnboarding', { cafe }) } as any)} />);
  });
  expect(texts(tree)).toContain('점주 인증이 끝났어요 · 등록된 메뉴 0개');
  await act(async () => {
    await find(tree, 'menu-onboarding-camera').props.onPress();
  });
  expect(mockPick).toHaveBeenCalledWith(true);
  expect(useMenuBoardStore.getState()).toMatchObject({ mode: 'register', cafe, images: [image] });
  expect(navigation.navigate).toHaveBeenCalledWith('MenuBoardCapture', { mode: 'register', cafe });
  await act(() => find(tree, 'menu-onboarding-manual').props.onPress());
  expect(useMenuBoardStore.getState().images).toEqual([]);
  expect(navigation.navigate).toHaveBeenLastCalledWith('MenuBoardReview');
  await act(() => tree.unmount());
});

test('update capture keeps several photos, hides manual entry and starts reading', async () => {
  const navigation = nav();
  mockPick.mockResolvedValueOnce(image).mockResolvedValueOnce({ ...image, uri: 'file://board-2.jpg' });
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardCaptureScreen {...({ navigation, route: route('MenuBoardCapture', { mode: 'update', cafe }) } as any)} />);
  });
  expect(useMenuBoardStore.getState().mode).toBe('update');
  expect(texts(tree)).toContain('바뀐 메뉴판을 찍어 주세요');
  expect(find(tree, 'menu-board-manual')).toBeUndefined();
  expect(find(tree, 'menu-board-read')).toBeUndefined();
  await act(async () => {
    await find(tree, 'menu-board-camera').props.onPress();
  });
  await act(async () => {
    await find(tree, 'menu-board-album').props.onPress();
  });
  expect(find(tree, 'menu-board-read').props.label).toBe('메뉴판 2장 읽기');
  await act(() => find(tree, 'menu-board-remove-0').props.onPress());
  expect(find(tree, 'menu-board-read').props.label).toBe('메뉴판 1장 읽기');
  await act(() => find(tree, 'menu-board-read').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('MenuBoardProcessing');
  await act(() => tree.unmount());
});

test('processing uploads each photo with its presigned url, then opens review or diff automatically', async () => {
  mockApi.requestMenuBoardUpload.mockImplementation(async (_cafeId, picked) => ({ uploadUrl: 'https://s3/put', imageKey: `key/${picked.name}` }));
  mockApi.uploadMenuBoardImage.mockResolvedValue(undefined);
  mockApi.scanMenuBoard.mockResolvedValue(mockMenuBoardScan());
  mockApi.diffMenuBoard.mockResolvedValue(mockMenuBoardDiff());
  useMenuBoardStore.getState().addImage(image);
  let navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<MenuBoardProcessingScreen {...({ navigation, route: route('MenuBoardProcessing') } as any)} />);
  });
  expect(mockApi.uploadMenuBoardImage).toHaveBeenCalledWith({ uploadUrl: 'https://s3/put', imageKey: 'key/board-1.jpg' }, image);
  expect(mockApi.scanMenuBoard).toHaveBeenCalledWith('cafe-1', ['key/board-1.jpg']);
  expect(useMenuBoardStore.getState().scanItems).toHaveLength(7);
  expect(navigation.replace).toHaveBeenCalledWith('MenuBoardReview');
  await act(() => tree.unmount());

  useMenuBoardStore.getState().start('update', cafe);
  useMenuBoardStore.getState().addImage(image);
  navigation = nav();
  await act(async () => {
    tree = Renderer.create(<MenuBoardProcessingScreen {...({ navigation, route: route('MenuBoardProcessing') } as any)} />);
  });
  expect(mockApi.diffMenuBoard).toHaveBeenCalledWith('cafe-1', ['key/board-1.jpg']);
  expect(navigation.replace).toHaveBeenCalledWith('MenuBoardDiff');
  await act(() => tree.unmount());
});

test('cancelling while reading goes back and never opens the result', async () => {
  let finishUpload!: (value: unknown) => void;
  mockApi.requestMenuBoardUpload.mockReturnValue(new Promise(resolve => { finishUpload = resolve; }));
  mockApi.scanMenuBoard.mockResolvedValue(mockMenuBoardScan());
  useMenuBoardStore.getState().addImage(image);
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardProcessingScreen {...({ navigation, route: route('MenuBoardProcessing') } as any)} />);
  });
  expect(texts(tree)).toEqual(expect.arrayContaining(['사진 올리기', '진행 중', '대기']));
  await act(() => find(tree, 'menu-board-cancel').props.onPress());
  expect(navigation.goBack).toHaveBeenCalled();
  await act(async () => {
    finishUpload({ uploadUrl: 'x', imageKey: 'k' });
  });
  expect(mockApi.scanMenuBoard).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  await act(() => tree.unmount());
});

test('review registers only switched-on menus and an edited low-confidence price is no longer flagged', async () => {
  useMenuBoardStore.getState().setScanItems(mockMenuBoardScan().items);
  mockApi.registerMenus.mockResolvedValue({ count: 6 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardReviewScreen {...({ navigation, route: route('MenuBoardReview') } as any)} />);
  });
  expect(find(tree, 'menu-review-submit').props.label).toBe('메뉴 7개 등록하기');
  expect(texts(tree)).toContain('확인 필요 2개');
  await act(() => find(tree, 'menu-review-price-1', 'onChangeText').props.onChangeText('3,000'));
  expect(texts(tree)).toContain('확인 필요 1개');
  await act(() => find(tree, 'menu-review-toggle-6').props.onPress());
  expect(find(tree, 'menu-review-submit').props.label).toBe('메뉴 6개 등록하기');
  await act(async () => {
    await find(tree, 'menu-review-submit').props.onPress();
  });
  const [cafeId, items] = mockApi.registerMenus.mock.calls[0];
  expect(cafeId).toBe('cafe-1');
  expect(items).toHaveLength(6);
  expect(items[1]).toEqual({ name: '카페라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3000 });
  expect(items[2]).toMatchObject({ name: '바닐라라떼', temperature: null });
  expect(navigation.reset).toHaveBeenCalledWith({
    index: 1,
    routes: [
      { name: 'Map' },
      { name: 'MenuRegisterDone', params: { count: 6, counts: { COFFEE: 4, DECAF: 1, BEVERAGE: 1, TEA: 0 } } },
    ],
  });
  await act(() => tree.unmount());
});

test('a menu the board missed can be added with a category before registering', async () => {
  useMenuBoardStore.getState().setScanItems([]);
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardReviewScreen {...({ navigation, route: route('MenuBoardReview') } as any)} />);
  });
  expect(find(tree, 'menu-review-submit').props.disabled).toBe(true);
  await act(() => find(tree, 'menu-review-add-missing').props.onPress());
  await act(() => find(tree, 'menu-editor-name', 'onChangeText').props.onChangeText('단호박 라떼'));
  await act(() => find(tree, 'menu-editor-price', 'onChangeText').props.onChangeText('3800'));
  await act(() => find(tree, 'menu-editor-category-BEVERAGE').props.onPress());
  await act(() => find(tree, 'menu-editor-done').props.onPress());
  expect(find(tree, 'menu-review-submit').props.label).toBe('메뉴 1개 등록하기');
  expect(texts(tree)).toContain('에이드·음료 · Regular · 온도 미확인');
  await act(() => tree.unmount());
});

test('done screen sends the owner to the center or the menu list without a back step', async () => {
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <MenuRegisterDoneScreen {...({ navigation, route: route('MenuRegisterDone', { count: 7, counts: { COFFEE: 4, DECAF: 1, BEVERAGE: 1, TEA: 1 } }) } as any)} />,
    );
  });
  expect(texts(tree)).toEqual(expect.arrayContaining(['메뉴 7개를 등록했어요', '4개', '커피']));
  await act(() => find(tree, 'menu-done-owner').props.onPress());
  expect(navigation.reset).toHaveBeenLastCalledWith({ index: 1, routes: [{ name: 'Map' }, { name: 'Owner' }] });
  await act(() => find(tree, 'menu-done-menus').props.onPress());
  expect(navigation.reset).toHaveBeenLastCalledWith({
    index: 2,
    routes: [{ name: 'Map' }, { name: 'Owner' }, { name: 'OwnerMenus' }],
  });
  await act(() => tree.unmount());
});

test('diff applies only switched-on changes and returns to the refreshed menu list', async () => {
  useMenuBoardStore.getState().start('update', cafe);
  useMenuBoardStore.getState().setDiff(mockMenuBoardDiff());
  mockApi.applyMenuDiff.mockResolvedValue({ applied: 4 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardDiffScreen {...({ navigation, route: route('MenuBoardDiff') } as any)} />);
  });
  const rendered = texts(tree);
  expect(rendered).toEqual(expect.arrayContaining(['가격 변경 2', '새 메뉴 1', '메뉴판에 없음 1', 'Regular · ICE · 2,900원 → 3,000원', 'Regular · HOT · 반영하면 판매 중지로 바뀌어요']));
  expect(rendered).toContain('그대로인 메뉴 4개는 바뀌지 않아요');
  expect(find(tree, 'menu-diff-apply').props.label).toBe('변경 3건 반영하기');
  expect(find(tree, 'menu-diff-toggle-3').props.accessibilityState).toEqual({ checked: false });
  await act(() => find(tree, 'menu-diff-toggle-3').props.onPress());
  expect(find(tree, 'menu-diff-apply').props.label).toBe('변경 4건 반영하기');
  await act(() => find(tree, 'menu-diff-toggle-0').props.onPress());
  await act(async () => {
    await find(tree, 'menu-diff-apply').props.onPress();
  });
  const [cafeId, request] = mockApi.applyMenuDiff.mock.calls[0];
  expect(cafeId).toBe('cafe-1');
  expect(request.changes.map((item: { name: string }) => item.name)).toEqual(['바닐라라떼', '단호박 라떼', '캐모마일티']);
  expect(navigation.popTo).toHaveBeenCalledWith('OwnerMenus', { cafeId: 'cafe-1', refreshedAt: expect.any(Number) });
  await act(() => tree.unmount());
});

test('review asks for an unreadable temperature and keeps the owner choice in the registration', async () => {
  useMenuBoardStore.getState().setScanItems(mockMenuBoardScan().items);
  mockApi.registerMenus.mockResolvedValue({ count: 7 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardReviewScreen {...({ navigation, route: route('MenuBoardReview') } as any)} />);
  });
  expect(texts(tree)).toEqual(expect.arrayContaining(['온도 미확인 1개', '온도를 확인할 수 없어요. HOT 또는 ICE를 선택해 주세요.']));
  expect(tree.root.findAll(node => node.props.testID === 'menu-review-temp-hint-2')).not.toHaveLength(0);
  await act(() => find(tree, 'menu-review-temp-2-ICE').props.onPress());
  expect(tree.root.findAll(node => node.props.testID === 'menu-review-temp-hint-2')).toHaveLength(0);
  expect(texts(tree)).not.toContain('온도 미확인 1개');
  await act(async () => {
    await find(tree, 'menu-review-submit').props.onPress();
  });
  const [, items] = mockApi.registerMenus.mock.calls[0];
  expect(items[2]).toEqual({ name: '바닐라라떼', category: 'COFFEE', size: 'Regular', temperature: 'ICE', price: 3400 });
  await act(() => tree.unmount());
});

test('the editor can leave a temperature unknown instead of guessing', async () => {
  useMenuBoardStore.getState().setScanItems([
    { name: '아메리카노', category: 'COFFEE', size: 'Regular', temperature: 'HOT', price: 1500, confidence: 0.95 },
  ]);
  mockApi.registerMenus.mockResolvedValue({ count: 1 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardReviewScreen {...({ navigation, route: route('MenuBoardReview') } as any)} />);
  });
  await act(() => find(tree, 'menu-review-edit-0').props.onPress());
  await act(() => find(tree, 'menu-editor-temperature-UNKNOWN').props.onPress());
  await act(() => find(tree, 'menu-editor-done').props.onPress());
  expect(tree.root.findAll(node => node.props.testID === 'menu-review-temp-hint-0')).not.toHaveLength(0);
  await act(async () => {
    await find(tree, 'menu-review-submit').props.onPress();
  });
  expect(mockApi.registerMenus.mock.calls[0][1][0]).toMatchObject({ name: '아메리카노', temperature: null });
  await act(() => tree.unmount());
});

test('diff keeps an unreadable new menu off, blocks a temperature that already exists and applies a chosen one', async () => {
  useMenuBoardStore.getState().start('update', cafe);
  useMenuBoardStore.getState().setDiff(
    diffMenuOptions(americano, [scan('HOT', 1500), scan('ICE', 2000), { ...scan(null, 1800), name: '라떼' }]),
  );
  mockApi.applyMenuDiff.mockResolvedValue({ applied: 1 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardDiffScreen {...({ navigation, route: route('MenuBoardDiff') } as any)} />);
  });
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: false });
  expect(find(tree, 'menu-diff-apply').props.disabled).toBe(true);
  expect(texts(tree)).toContain('그대로인 메뉴 2개는 바뀌지 않아요');
  await act(() => find(tree, 'menu-diff-temp-0-HOT').props.onPress());
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: true });
  expect(tree.root.findAll(node => node.props.testID === 'menu-diff-temp-hint-0')).toHaveLength(0);
  await act(async () => {
    await find(tree, 'menu-diff-apply').props.onPress();
  });
  expect(mockApi.applyMenuDiff.mock.calls[0][1].changes).toEqual([
    expect.objectContaining({ kind: 'NEW', name: '라떼', temperature: 'HOT', price: 1800 }),
  ]);
  await act(() => tree.unmount());

  useMenuBoardStore.getState().setDiff(diffMenuOptions(americano, [scan(null, 1800)]));
  await act(() => {
    tree = Renderer.create(<MenuBoardDiffScreen {...({ navigation, route: route('MenuBoardDiff') } as any)} />);
  });
  await act(() => find(tree, 'menu-diff-temp-0-ICE').props.onPress());
  expect(texts(tree).some(text => text.includes('이미 등록된 옵션'))).toBe(true);
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: false });
  await act(() => tree.unmount());
});

const newMenu = (temperature: 'HOT' | 'ICE' | null, price: number | null, category: 'COFFEE' | null = 'COFFEE') => ({
  kind: 'NEW' as const, menuId: null, name: '바닐라라떼', category, size: 'Regular', temperature, previousPrice: null, price,
});

test('two new menus that become the same option are caught against the latest selection and before applying', () => {
  // 리뷰 사례: 바닐라라떼 Regular ICE 3,400원 + 바닐라라떼 Regular 미확인 3,500원 → 두 번째를 ICE 로 고름
  const changes = [newMenu('ICE', 3400), newMenu('ICE', 3500)];
  expect(diffOptionConflict(1, changes, [true, true], [])).toContain('두 번 선택됐어요');
  // 첫 번째를 꺼 두면 겹치지 않습니다.
  expect(diffOptionConflict(1, changes, [false, true], [])).toBeNull();
  expect(validateDiffSelection(changes, [true, true], [])).toContain('두 번 선택됐어요');
  expect(validateDiffSelection(changes, [true, false], [])).toBeNull();
  // HOT 과 ICE 는 다른 옵션입니다.
  expect(validateDiffSelection([newMenu('ICE', 3400), newMenu('HOT', 3500)], [true, true], [])).toBeNull();
});

test('a new menu without a price or category is never selected by default and cannot be applied', () => {
  // 리뷰 사례: { kind: NEW, name: 바닐라라떼, category: null, temperature: HOT, price: null }
  const incomplete = newMenu('HOT', null, null);
  expect(defaultDiffEnabled(incomplete)).toBe(false);
  expect(diffItemMissing(incomplete)).toBe('바닐라라떼의 분류를 골라 주세요.');
  expect(diffItemMissing({ ...incomplete, category: 'COFFEE' })).toBe('바닐라라떼의 가격을 입력해 주세요.');
  expect(validateDiffSelection([incomplete], [true], [])).toBe('바닐라라떼의 분류를 골라 주세요.');
  expect(defaultDiffEnabled(newMenu('HOT', 3400))).toBe(true);
});

test('choosing a temperature that duplicates another switched-on new menu is blocked on the screen', async () => {
  useMenuBoardStore.getState().start('update', cafe);
  useMenuBoardStore.getState().setDiff({ changes: [newMenu('ICE', 3400), newMenu(null, 3500)], unchanged: [] });
  mockApi.applyMenuDiff.mockResolvedValue({ applied: 1 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardDiffScreen {...({ navigation, route: route('MenuBoardDiff') } as any)} />);
  });
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: true });
  await act(() => find(tree, 'menu-diff-temp-1-ICE').props.onPress());
  expect(texts(tree).some(text => text.includes('두 번 선택됐어요'))).toBe(true);
  expect(find(tree, 'menu-diff-toggle-1').props.accessibilityState).toEqual({ checked: false });
  // 첫 번째를 끄면 두 번째를 ICE 로 켤 수 있고, 반영에는 하나만 갑니다.
  await act(() => find(tree, 'menu-diff-toggle-0').props.onPress());
  await act(() => find(tree, 'menu-diff-temp-1-ICE').props.onPress());
  expect(find(tree, 'menu-diff-toggle-1').props.accessibilityState).toEqual({ checked: true });
  await act(async () => {
    await find(tree, 'menu-diff-apply').props.onPress();
  });
  expect(mockApi.applyMenuDiff.mock.calls[0][1].changes).toEqual([
    expect.objectContaining({ name: '바닐라라떼', temperature: 'ICE', price: 3500 }),
  ]);
  await act(() => tree.unmount());
});

test('a new menu missing price and category starts off, explains why and can be filled in before applying', async () => {
  useMenuBoardStore.getState().start('update', cafe);
  useMenuBoardStore.getState().setDiff({ changes: [newMenu('HOT', null, null)], unchanged: [] });
  mockApi.applyMenuDiff.mockResolvedValue({ applied: 1 });
  const navigation = nav();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<MenuBoardDiffScreen {...({ navigation, route: route('MenuBoardDiff') } as any)} />);
  });
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: false });
  expect(texts(tree)).toContain('가격·분류를 입력해야 반영할 수 있어요.');
  await act(() => find(tree, 'menu-diff-toggle-0').props.onPress());
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: false });
  expect(texts(tree)).toContain('바닐라라떼의 분류를 골라 주세요.');
  await act(() => find(tree, 'menu-diff-fix-0').props.onPress());
  await act(() => find(tree, 'menu-diff-editor-price', 'onChangeText').props.onChangeText('3,600'));
  await act(() => find(tree, 'menu-diff-editor-category-COFFEE').props.onPress());
  await act(() => find(tree, 'menu-diff-editor-done').props.onPress());
  expect(texts(tree)).not.toContain('가격·분류를 입력해야 반영할 수 있어요.');
  await act(() => find(tree, 'menu-diff-toggle-0').props.onPress());
  expect(find(tree, 'menu-diff-toggle-0').props.accessibilityState).toEqual({ checked: true });
  await act(async () => {
    await find(tree, 'menu-diff-apply').props.onPress();
  });
  expect(mockApi.applyMenuDiff.mock.calls[0][1].changes).toEqual([
    expect.objectContaining({ kind: 'NEW', name: '바닐라라떼', category: 'COFFEE', temperature: 'HOT', price: 3600 }),
  ]);
  await act(() => tree.unmount());
});
