import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import RecommendScreen from '../src/screens/recommend/RecommendScreen';
import { native } from '../src/app/native';
import { DEFAULT_PREFERENCES } from '../src/app/domain';
import { Chip } from '../src/app/ui';
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
  usePersonalStore.setState({
    onboarded: false,
    preferences: DEFAULT_PREFERENCES,
  });
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

test.each(['fresh', 'saved'])(
  'a new recommendation with %s preferences starts without selected chips',
  async source => {
    if (source === 'saved') {
      usePersonalStore.setState({
        onboarded: true,
        preferences: {
          ...DEFAULT_PREFERENCES,
          priceMax: 3000,
          purposes: ['매장 이용'],
          tastes: ['산미 적은'],
          travelMode: 'drive',
          travelMinutes: 10,
        },
      });
    }
    jest.mocked(native.getLocation).mockResolvedValue({
      latitude: 37.5,
      longitude: 127,
    });
    const { tree, navigation } = await render();
    const action = (label: string) =>
      tree.root.findAll(
        node =>
          node.props.label === label &&
          typeof node.props.onPress === 'function',
      )[0].props.onPress;

    const selectedChips = () =>
      tree.root
        .findAllByType(Chip)
        .filter(chip => chip.props.selected)
        .map(chip => chip.props.label);
    expect(selectedChips()).toEqual([]);
    await act(async () => {
      await action('AI 추천 받기')();
    });
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'RecommendationResult',
      {
        request: expect.objectContaining({
          budget: null,
          purposes: [],
          tastes: [],
          travelMode: 'walk',
          travelMinutes: 10,
        }),
      },
    );

    await act(() => {
      action('5천원 이하')();
      action('테이크아웃')();
      action('고소한')();
      action('도보 5분')();
    });
    expect(selectedChips()).toEqual([
      '5천원 이하',
      '테이크아웃',
      '고소한',
      '도보 5분',
    ]);
    await act(async () => {
      await action('AI 추천 받기')();
    });
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'RecommendationResult',
      {
        request: expect.objectContaining({
          budget: 5000,
          purposes: ['테이크아웃'],
          tastes: ['고소한'],
          travelMode: 'walk',
          travelMinutes: 5,
        }),
      },
    );
  },
);

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
