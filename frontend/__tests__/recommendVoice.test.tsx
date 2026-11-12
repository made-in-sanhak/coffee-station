import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RecommendScreen from '../src/screens/recommend/RecommendScreen';
import { native } from '../src/app/native';
import { api } from '../src/app/api';
import { Button, Chip } from '../src/app/ui';
import { usePersonalStore } from '../src/store/personalStore';
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/app/native', () => ({
  native: { recognizeSpeech: jest.fn(), getLocation: jest.fn() },
}));
let trees: Renderer.ReactTestRenderer[];
const render = async () => {
  let focused = true;
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    isFocused: () => focused,
  };
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <RecommendScreen
        {...({ navigation } as unknown as React.ComponentProps<
          typeof RecommendScreen
        >)}
      />,
    );
  });
  trees.push(tree);
  const microphone = () =>
    tree.root.findAllByProps({ testID: 'recommend-voice' })[0];
  const input = () =>
    tree.root.findAllByProps({ testID: 'recommend-query' })[0];
  return {
    tree,
    microphone,
    input,
    blur: () => {
      focused = false;
    },
    navigation,
  };
};
beforeEach(() => {
  trees = [];
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(() => {
    trees.forEach(tree => tree.unmount());
  });
});

test('recognized speech becomes the editable recommendation request', async () => {
  jest
    .mocked(native.recognizeSpeech)
    .mockResolvedValue('  조용한 카페를 찾아줘  ');
  const { microphone, input, navigation } = await render();
  await act(async () => {
    await microphone().props.onPress();
  });
  expect(native.recognizeSpeech).toHaveBeenCalledTimes(1);
  expect(input().props.value).toBe('조용한 카페를 찾아줘');
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('repeated microphone presses start one recognizer and limit input to 200 characters', async () => {
  let resolve!: (value: string) => void;
  jest.mocked(native.recognizeSpeech).mockReturnValue(
    new Promise<string>(done => {
      resolve = done;
    }),
  );
  const { microphone, input } = await render();
  const press = microphone().props.onPress;
  let recording!: Promise<void>;
  await act(() => {
    recording = press();
    press().catch(() => undefined);
  });
  expect(native.recognizeSpeech).toHaveBeenCalledTimes(1);
  expect(microphone().props.disabled).toBe(true);
  await act(async () => {
    resolve('가'.repeat(220));
    await recording;
  });
  expect(input().props.value).toHaveLength(200);
  expect(microphone().props.disabled).toBe(false);
});

test('canceling speech preserves the typed query without an error', async () => {
  jest
    .mocked(native.recognizeSpeech)
    .mockRejectedValue(
      Object.assign(new Error('인식 취소'), { code: 'E_CANCELLED' }),
    );
  const { tree, microphone, input } = await render();
  await act(() => input().props.onChangeText('기존 조건'));
  await act(async () => {
    await microphone().props.onPress();
  });
  expect(input().props.value).toBe('기존 조건');
  expect(JSON.stringify(tree.toJSON())).not.toContain('인식 취소');
});

test('speech failures remain visible and leave the query editable for retry', async () => {
  jest
    .mocked(native.recognizeSpeech)
    .mockRejectedValue(new Error('음성 인식 앱을 찾을 수 없습니다.'));
  const { tree, microphone, input } = await render();
  await act(async () => {
    await microphone().props.onPress();
  });
  expect(JSON.stringify(tree.toJSON())).toContain(
    '음성 인식 앱을 찾을 수 없습니다.',
  );
  expect(input().props.editable).toBe(true);
  expect(microphone().props.disabled).toBe(false);
});

test('a late recognition result after leaving the page does not replace the query', async () => {
  let resolve!: (value: string) => void;
  jest.mocked(native.recognizeSpeech).mockReturnValue(
    new Promise<string>(done => {
      resolve = done;
    }),
  );
  const { microphone, input, blur } = await render();
  let recording!: Promise<void>;
  await act(() => {
    recording = microphone().props.onPress();
  });
  blur();
  await act(async () => {
    resolve('늦게 도착한 조건');
    await recording;
  });
  expect(input().props.value).toBe('');
});

test('natural-language preparation sends selected chips and confirms merged conditions', async () => {
  const previous = usePersonalStore.getState().onboarded;
  usePersonalStore.setState({ onboarded: false });
  const proposal = {
    status: 'AWAITING_CONFIRMATION', proposalId: 'signed-merged-proposal',
    conditions: { maxPrice: 5000, purpose: null, tastes: ['MILK', 'DECAF'] },
    evidence: { maxPrice: '5천 원 이하', tastes: '디카페인' }, unresolved: [], extractionMode: 'mock',
  };
  const post = jest.spyOn(api, 'post').mockResolvedValue(proposal);
  jest.mocked(native.getLocation).mockRejectedValueOnce(new Error('위치 없음'));
  try {
    const { tree, input, navigation } = await render();
    await act(() => {
      tree.root.findAllByType(Chip).find(node => node.props.label === '3천원 이하')!.props.onPress();
      tree.root.findAllByType(Chip).find(node => node.props.label === '우유 들어간')!.props.onPress();
      input().props.onChangeText('5천 원 이하 디카페인 메뉴를 찾아줘');
    });
    await act(async () => {
      await tree.root.findAllByType(Button).find(node => node.props.label === '조건에 맞는 카페 찾기')!.props.onPress();
    });
    expect(post).toHaveBeenCalledWith('/api/recommendations/chat/prepare', {
      message: '5천 원 이하 디카페인 메뉴를 찾아줘',
      selectedConditions: { maxPrice: 3000, purpose: null, tastes: ['MILK'] },
      location: undefined,
    });
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('디카페인, 우유 들어간');
    await act(() => {
      tree.root.findAllByType(Button).find(node => node.props.label === '분석된 조건 확인 후 검색')!.props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('RecommendationResult', {
      request: expect.objectContaining({ budget: 5000, tastes: ['디카페인', '우유 들어간'] }),
      proposalId: 'signed-merged-proposal',
    });
    await act(() => {
      tree.root.findAllByType(Chip).find(node => node.props.label === '3천원 이하')!.props.onPress();
    });
    expect(tree.root.findAllByType(Button).some(node => node.props.label === '분석된 조건 확인 후 검색')).toBe(false);
  } finally {
    post.mockRestore();
    usePersonalStore.setState({ onboarded: previous });
  }
});
