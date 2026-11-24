import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { Map, Astroid, MessageCircle, UserRound } from 'lucide-react-native';
import BottomTabBar from '../src/navigation/BottomTabBar';
import { Screen, TabBar, type AppTab } from '../src/app/ui';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
const trees: Renderer.ReactTestRenderer[] = [];
const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn() });
async function renderBar(active: AppTab = 'map', nav = navigation()) {
  let tree!: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<TabBar active={active} navigation={nav} />); });
  trees.push(tree);
  return { tree, nav };
}
const press = (tree: Renderer.ReactTestRenderer, label: string) => tree.root.findAll(node =>
  node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress();
afterEach(async () => { await act(() => { trees.splice(0).forEach(tree => tree.unmount()); }); });

test('shared bar renders one canonical merged Park bar with original icons and geometry', async () => {
  const { tree } = await renderBar('recommend');
  expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(1);
  const bar = tree.root.findByType(BottomTabBar);
  const container = bar.findAllByType(View).find(node => StyleSheet.flatten(node.props.style)?.height === 62)!;
  expect(StyleSheet.flatten(container.props.style)).toMatchObject({ height: 62, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E8E1D8' });
  expect(StyleSheet.flatten(container.props.style).paddingBottom).toBeUndefined();
  for (const Icon of [Map, Astroid, MessageCircle, UserRound])
    expect(bar.findByType(Icon).props.size).toBe(22);
  expect(bar.findByType(Astroid).props.strokeWidth).toBe(2.5);
  expect(bar.findByType(Astroid).props.color).toBe('#1F5C3F');
  expect(bar.findByType(Map).props.strokeWidth).toBe(1.8);
  const labels = [...new Set(bar.findAll(node => node.props.accessibilityRole === 'tab').map(node => node.props.accessibilityLabel))];
  expect(labels).toEqual(['지도', '추천', '휴게소', '내 기록']);
  const selected = bar.findAll(node => node.props.accessibilityLabel === '추천' && node.props.accessibilityRole === 'tab')[0];
  expect(selected.props.accessibilityState).toEqual({ selected: true });
});

test('all four tabs keep working destinations and Map returns to the existing stack entry', async () => {
  const { tree, nav } = await renderBar('community');
  await act(() => { for (const label of ['지도','추천','휴게소','내 기록']) press(tree,label); });
  expect(nav.popTo.mock.calls).toEqual([['Map']]);
  expect(nav.navigate.mock.calls).toEqual([
    ['Recommend'], ['Community'], ['Calendar', undefined, { pop: true }],
  ]);
});

test('selected group labels on detail screens still return to their root destination', async () => {
  const map = await renderBar('map');
  await act(() => press(map.tree,'지도'));
  expect(map.nav.popTo).toHaveBeenCalledWith('Map');
  const garage = await renderBar('garage');
  await act(() => press(garage.tree,'내 기록'));
  expect(garage.nav.navigate).toHaveBeenCalledWith('Calendar', undefined, { pop: true });
});

test('Map falls back to navigate when popTo is unavailable and receipt selects 내 기록', async () => {
  const nav = { navigate: jest.fn(), goBack: jest.fn() };
  let tree!: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<TabBar active="receipt" navigation={nav} />); });
  trees.push(tree);
  await act(() => press(tree,'지도'));
  expect(nav.navigate).toHaveBeenCalledWith('Map');
  const selected = tree.root.findAll(node => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === '내 기록')[0];
  expect(selected.props.accessibilityState).toEqual({ selected: true });
});

test('shared Screen includes one canonical footer and keeps bottom safe area ownership', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(() => { tree = Renderer.create(<Screen navigation={navigation()} tab="garage"><View /></Screen>); });
  trees.push(tree);
  expect(tree.root.findAllByType(BottomTabBar)).toHaveLength(1);
  const safe = tree.root.findAll(node => Array.isArray(node.props.edges) && node.props.edges.includes('bottom'));
  expect(safe.length).toBeGreaterThan(0);
  const footer = tree.root.findByType(BottomTabBar);
  expect(footer.findAll(node => Array.isArray(node.props.edges))).toHaveLength(0);
});
