import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { useResource } from '../../app/api';
import { native } from '../../app/native';
import { DEFAULT_PREFERENCES } from '../../app/domain';
import { usePersonalStore } from '../../store/personalStore';
import { useSessionStore } from '../../store/sessionStore';
import GarageScreen from './GarageScreen';

jest.mock('../../app/api', () => ({ useResource: jest.fn() }));
jest.mock('../../app/native', () => ({
  native: { secureGet: jest.fn(), secureSet: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const stats = {
  count: 42,
  total: 48300,
  caffeineMg: 300,
  visitedCafeCount: 18,
  stamps: 2,
  level: 3,
  levelStartCups: 30,
  nextLevelCups: 50,
  maxLevel: 4,
  reviewCount: 7,
  savedAmount: 12400,
};
beforeEach(() => {
  jest.clearAllMocks();
  (native.secureGet as jest.Mock).mockResolvedValue(null);
  (native.secureSet as jest.Mock).mockResolvedValue(undefined);
  (useResource as jest.Mock).mockImplementation((path: string) => ({
    data: path === '/api/users/me/statistics' ? stats : [],
    error: null,
    loading: false,
    reload: jest.fn(),
  }));
  useSessionStore.setState({
    user: {
      id: 'user',
      nickname: '테스트',
      profileImageUrl: null,
      role: 'USER',
    },
    accessToken: 'token',
  });
  usePersonalStore.setState({
    preferences: DEFAULT_PREFERENCES,
    purchases: [],
    favoriteIds: [],
    selectedCarSkinLevel: 3,
    hydrated: true,
    error: null,
  });
});
const render = async () => {
  let tree!: Renderer.ReactTestRenderer;
  const props = {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: () => () => {},
      canGoBack: () => true,
    },
  } as unknown as React.ComponentProps<typeof GarageScreen>;
  await act(async () => {
    tree = Renderer.create(<GarageScreen {...props} />);
  });
  return tree;
};
const tile = (tree: Renderer.ReactTestRenderer, level: number) =>
  tree.root.findAll(
    node =>
      node.props.accessibilityLabel?.includes(`레벨 ${level}`) &&
      node.props.onPress,
  )[0];

test('garage selection changes only after encrypted persistence succeeds', async () => {
  (native.secureSet as jest.Mock).mockRejectedValueOnce(
    new Error('기기 저장 실패'),
  );
  const tree = await render();
  await act(async () => tile(tree, 1).props.onPress());
  expect(usePersonalStore.getState().selectedCarSkinLevel).toBe(3);
  expect(JSON.stringify(tree.toJSON())).toContain('기기 저장 실패');
  await act(async () => tile(tree, 1).props.onPress());
  expect(usePersonalStore.getState().selectedCarSkinLevel).toBe(1);
  await act(() => tree.unmount());
});

test('a skin above configured maximum explains missing unlock conditions without inventing a target', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await render();
  expect(JSON.stringify(tree.toJSON())).toContain('해금 조건 미설정');
  await act(async () => tile(tree, 6).props.onPress());
  expect(alert).toHaveBeenCalledWith('해금 조건 미설정', expect.any(String));
  expect(native.secureSet).not.toHaveBeenCalled();
  await act(() => tree.unmount());
  alert.mockRestore();
});
