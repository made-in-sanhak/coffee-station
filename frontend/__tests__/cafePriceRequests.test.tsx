import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import CafeDetailScreen from '../src/screens/cafe/CafeDetailScreen';
import { api } from '../src/app/api';
import { useSessionStore } from '../src/store/sessionStore';

const mockCafe = {
  id: 'c',
  name: '등록 카페',
  address: '주소',
  latitude: 37,
  longitude: 127,
};
const mockMenu = {
  id: 'm',
  cafeId: 'c',
  name: '아메리카노',
  size: 'Regular',
  temperature: 'ICE',
  price: 2000,
  caffeineMg: 150,
};
jest.mock('../src/app/api', () => ({
  api: { post: jest.fn() },
  useResource: (path: string) => ({
    data:
      path === '/api/cafes/c'
        ? mockCafe
        : path.endsWith('/menus')
        ? [mockMenu]
        : [],
    loading: false,
    error: null,
    reload: jest.fn(),
  }),
}));
jest.mock('../src/app/native', () => ({
  native: { randomHex: jest.fn(async () => 'unique-interaction') },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const navigation = {
  navigate: jest.fn(),
  canGoBack: () => true,
  goBack: jest.fn(),
};
const props = { navigation, route: { params: { cafeId: 'c' } } } as any;
const action = (tree: Renderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  )[0];
beforeEach(() => {
  jest.clearAllMocks();
  (api.post as jest.Mock).mockResolvedValue({ id: 'request', status: 'OPEN' });
  useSessionStore.setState({ accessToken: 'session' });
});
test('detail entry and successfully opened directions record real interactions only once', async () => {
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<CafeDetailScreen {...props} />);
  });
  expect(api.post).toHaveBeenCalledWith('/api/cafes/c/interactions', {
    type: 'DETAIL_VIEW',
    interactionKey: 'unique-interaction',
  });
  await act(() => tree!.update(<CafeDetailScreen {...props} />));
  expect(
    (api.post as jest.Mock).mock.calls.filter(
      c => c[1]?.type === 'DETAIL_VIEW',
    ),
  ).toHaveLength(1);
  await act(async () => {
    await action(tree!, '경유 길찾기').props.onPress();
  });
  expect(api.post).toHaveBeenCalledWith('/api/cafes/c/interactions', {
    type: 'DIRECTIONS',
    interactionKey: 'unique-interaction',
  });
  await act(() => tree!.unmount());
  jest.restoreAllMocks();
});
test('a member submits a positive integer price for the selected menu and sees confirmation', async () => {
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<CafeDetailScreen {...props} />);
  });
  expect(action(tree!, '가격 확인 요청')).toBeDefined();
  await act(() => action(tree!, '가격 확인 요청').props.onPress());
  const input = tree!.root.findByProps({
    accessibilityLabel: '확인한 메뉴 가격',
  });
  await act(() => input.props.onChangeText('2500'));
  await act(async () => action(tree!, '요청 보내기').props.onPress());
  expect(api.post).toHaveBeenCalledWith('/api/cafes/c/price-requests', {
    menuId: 'm',
    reportedPrice: 2500,
    note: '',
  });
  expect(
    tree!.root
      .findAllByType(Text)
      .map(n => n.props.children)
      .flat(Infinity)
      .join(' '),
  ).toContain('가격 확인을 요청했습니다.');
  await act(() => tree!.unmount());
});
test('anonymous price requests lead to login without submitting a report', async () => {
  useSessionStore.setState({ accessToken: null });
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<CafeDetailScreen {...props} />);
  });
  await act(() => action(tree!, '가격 확인 요청').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Login');
  expect(
    (api.post as jest.Mock).mock.calls.some(c =>
      c[0].endsWith('price-requests'),
    ),
  ).toBe(false);
  await act(() => tree!.unmount());
});
