import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { api } from '../../app/api';
import type { Purchase, ReceiptDraft } from '../../app/domain';
import { native } from '../../app/native';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import ReceiptReviewScreen from './ReceiptReviewScreen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../../app/api', () => ({ api: { post: jest.fn() } }));
jest.mock('../../app/native', () => ({
  native: { secureSet: jest.fn(), secureGet: jest.fn(), randomHex: jest.fn() },
}));

const draft: ReceiptDraft = {
  storeName: '테스트 카페',
  purchasedAt: '2026-10-13T08:42:00',
  total: 2000,
  verified: false,
  items: [
    { menuName: '아메리카노', quantity: 1, unitPrice: 2000, caffeineMg: null },
  ],
};
const control = (tree: Renderer.ReactTestRenderer, id: string) =>
  tree.root.findAll(node => node.props.testID === id)[0];
const render = async (value = draft) => {
  const replace = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  const props = {
    navigation: {
      replace,
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: () => true,
    },
    route: { params: { draft: value } },
  } as unknown as React.ComponentProps<typeof ReceiptReviewScreen>;
  await act(() => {
    tree = Renderer.create(<ReceiptReviewScreen {...props} />);
  });
  return { tree, replace };
};

beforeEach(() => {
  jest.clearAllMocks();
  (native.secureSet as jest.Mock).mockResolvedValue(undefined);
  (native.randomHex as jest.Mock).mockResolvedValue('test-random');
  usePersonalStore.setState({ purchases: [], hydrated: true, error: null });
  useSessionStore.setState({ user: null, accessToken: null });
});

test('anonymous save persists personal manual purchase without fabricated verification or caffeine', async () => {
  const { tree, replace } = await render();
  await act(async () => control(tree, 'receipt-save').props.onPress());
  expect(api.post).not.toHaveBeenCalled();
  expect(usePersonalStore.getState().purchases).toEqual([
    expect.objectContaining({
      id: 'local-test-random',
      source: 'manual',
      verified: false,
      caffeineMg: null,
      total: 2000,
    }),
  ]);
  expect(replace).toHaveBeenCalledWith('Calendar');
  await act(() => tree.unmount());
});

test('server failure leaves receipt editable and only explicit fallback creates an unverified local record', async () => {
  useSessionStore.setState({
    user: {
      id: 'user',
      nickname: '테스트',
      profileImageUrl: null,
      role: 'USER',
    },
    accessToken: 'token',
  });
  (api.post as jest.Mock).mockRejectedValue(new Error('서버 연결 실패'));
  const { tree, replace } = await render({
    ...draft,
    id: 'receipt-id',
    verified: true,
  });
  await act(async () => control(tree, 'receipt-save').props.onPress());
  expect(replace).not.toHaveBeenCalled();
  expect(usePersonalStore.getState().purchases).toHaveLength(0);
  expect(api.post).toHaveBeenCalledWith('/api/purchases/batch', {
    idempotencyKey: 'test-random',
    items: [
      expect.objectContaining({ receiptId: 'receipt-id', source: 'ocr' }),
    ],
  });
  await act(async () => control(tree, 'receipt-save-local').props.onPress());
  expect(usePersonalStore.getState().purchases[0]).toMatchObject({
    source: 'manual',
    verified: false,
  });
  expect(usePersonalStore.getState().purchases[0].receiptId).toBeUndefined();
  await act(() => tree.unmount());
});

test('two immediate save taps commit the draft once', async () => {
  const { tree } = await render();
  const save = control(tree, 'receipt-save').props.onPress;
  await act(async () => {
    await Promise.all([save(), save()]);
  });
  expect(native.secureSet).toHaveBeenCalledTimes(1);
  expect(usePersonalStore.getState().purchases).toHaveLength(1);
  await act(() => tree.unmount());
});

test('successful server batch is not resubmitted when local storage needs a retry', async () => {
  useSessionStore.setState({
    user: {
      id: 'user',
      nickname: '테스트',
      profileImageUrl: null,
      role: 'USER',
    },
    accessToken: 'token',
  });
  const saved: Purchase[] = [
    {
      id: 'server-purchase',
      cafeName: draft.storeName,
      menuName: '아메리카노',
      quantity: 1,
      unitPrice: 2000,
      total: 2000,
      caffeineMg: null,
      source: 'manual',
      purchasedAt: draft.purchasedAt,
      verified: false,
    },
  ];
  (api.post as jest.Mock).mockResolvedValue(saved);
  (native.secureSet as jest.Mock).mockRejectedValueOnce(
    new Error('기기 저장 실패'),
  );
  const { tree, replace } = await render();
  await act(async () => control(tree, 'receipt-save').props.onPress());
  expect(replace).not.toHaveBeenCalled();
  expect(usePersonalStore.getState().purchases).toEqual([]);
  await act(async () => control(tree, 'receipt-save').props.onPress());
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(usePersonalStore.getState().purchases).toEqual(saved);
  expect(replace).toHaveBeenCalledWith('Calendar');
  await act(() => tree.unmount());
});
