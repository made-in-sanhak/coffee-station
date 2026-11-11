import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFERENCES } from '../src/app/domain';
import ParkPreferencesRoute from '../src/integration/ParkPreferencesRoute';
import { usePersonalStore } from '../src/store/personalStore';
import { usePreferenceStore } from '../src/store/preferenceStore';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/app/native', () => ({
  native: { secureSet: jest.fn(async () => {}), secureGet: jest.fn(async () => null) },
}));

const saved = {
  brands: ['콜드브루'],
  size: 'Large',
  orderMethod: '테이크아웃',
  cafeType: '개인 카페',
  tastes: ['고소한'],
};

test('editing one choice retains saved fields and waits for durable storage before returning', async () => {
  usePreferenceStore.setState({ isCompleted: true, hasHydrated: true, preferences: saved });
  usePersonalStore.setState({
    hydrated: true,
    onboarded: true,
    preferences: { ...DEFAULT_PREFERENCES, priceMax: 4000 },
  });
  const originalSetItem = AsyncStorage.setItem.bind(AsyncStorage);
  let finishWrite!: () => void;
  const waiting = new Promise<void>(resolve => { finishWrite = resolve; });
  const write = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
    await waiting;
    await originalSetItem(key, value);
  });
  const goBack = jest.fn();
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<ParkPreferencesRoute {...({
      navigation: { goBack, isFocused: () => true }, route: { name: 'Preferences', key: 'preferences' },
    } as any)} />);
  });
  const button = (label: RegExp) => {
    let node: Renderer.ReactTestInstance | null = tree.root.findAll(candidate =>
      typeof candidate.props.children === 'string' && label.test(candidate.props.children),
    )[0] ?? null;
    while (node && typeof node.props.onPress !== 'function') node = node.parent;
    if (!node) throw new Error('Could not find the preference action');
    return node;
  };
  let save: void | Promise<void>;
  try {
    await act(() => button(/^카페라떼$/).props.onPress());
    await act(async () => { save = button(/^(시작하기|저장하기)$/).props.onPress(); });
    expect(goBack).not.toHaveBeenCalled();
    await act(async () => { finishWrite(); await save; });
    expect(goBack).toHaveBeenCalledTimes(1);
    const value = JSON.parse((await AsyncStorage.getItem('coffee-station-preferences'))!);
    expect(value.state.preferences).toEqual({ ...saved, brands: ['콜드브루', '카페라떼'] });
    expect(usePersonalStore.getState().preferences).toMatchObject({
      menus: ['콜드브루', '카페라떼'], sizes: ['Large'], priceMax: 4000,
    });
  } finally {
    finishWrite();
    await act(() => tree.unmount());
    write.mockRestore();
  }
});
