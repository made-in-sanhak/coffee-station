import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Button, TextInput } from 'react-native';
import RecommendationScreen from '../src/RecommendationScreen';

test('input then explicit confirmation applies edited budget on screen', async () => {
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<RecommendationScreen />); });
  expect(JSON.stringify(tree.toJSON())).not.toContain('에스프레소');
  await act(async () => {
    await tree.root.findAllByType(Button).find(b => b.props.title === '조건 추출')!.props.onPress();
  });
  expect(JSON.stringify(tree.toJSON())).not.toContain('에스프레소');
  await act(async () => {
    tree.root.findAllByType(TextInput).find(input => input.props.accessibilityLabel === '최대 가격')!.props.onChangeText('3500');
  });
  await act(async () => {
    await tree.root.findAllByType(Button).find(b => b.props.title === '이 조건으로 확인·추천')!.props.onPress();
  });
  const rendered = JSON.stringify(tree.toJSON());
  expect(rendered).toContain('에스프레소');
  expect(rendered).toContain('아메리카노');
  expect(rendered).not.toContain('디카페인 커피');
  await act(async () => { tree.unmount(); });
});
