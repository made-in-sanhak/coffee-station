import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { mockMenuBoardDiff, mockMenuBoardScan } from '../src/api/mocks/menuBoard';
import { useMenuBoardStore } from '../src/store/menuBoardStore';
import {
  blankReviewItem,
  countByCategory,
  defaultDiffEnabled,
  diffSummary,
  needsCheck,
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
  expect(reviewSummary(items)).toEqual({ total: 7, needsCheck: 2, included: 7 });
  items[1] = { ...items[1], checked: true };
  items[6] = { ...items[6], include: false };
  expect(reviewSummary(items)).toEqual({ total: 7, needsCheck: 1, included: 6 });
  expect(validateReviewItems(items)).toBeNull();
  const bulk = toBulkItems(items);
  expect(bulk).toHaveLength(6);
  expect(bulk[0]).toEqual({ name: '아이스 아메리카노', category: 'COFFEE', size: 'Regular', price: 2000 });
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
  expect(items[1]).toEqual({ name: '카페라떼', category: 'COFFEE', size: 'Regular', price: 3000 });
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
  expect(texts(tree)).toContain('에이드·음료 · Regular');
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
  expect(rendered).toEqual(expect.arrayContaining(['가격 변경 2', '새 메뉴 1', '메뉴판에 없음 1', '2,900원 → 3,000원', '반영하면 판매 중지로 바뀌어요']));
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
