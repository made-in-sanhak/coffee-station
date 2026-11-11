import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Alert, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../src/app/api';
import { native } from '../src/app/native';
import CommunityScreen from '../src/screens/community/CommunityScreen';
import MeetupDetailScreen from '../src/screens/community/MeetupDetailScreen';
import RecommendationResultScreen from '../src/screens/recommend/RecommendationResultScreen';
import { useSavedMeetup } from '../src/screens/community/useSavedMeetup';
import { useSessionStore } from '../src/store/sessionStore';

const mockResources: Record<string, unknown> = {};
const mockReloads: Record<string, jest.Mock> = {};
jest.mock('../src/app/api', () => ({
  api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
  useResource: (path: string) => ({
    data: mockResources[path],
    loading: false,
    error: null,
    reload: mockReloads[path] ?? (mockReloads[path] = jest.fn()),
  }),
}));
jest.mock('../src/app/native', () => ({
  native: {
    secureGet: jest.fn(),
    secureSet: jest.fn(),
    secureRemove: jest.fn(),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
jest.mock('../src/utils/env', () => ({ env: { useMockApi: false } }));

const review = {
  id: 'review-1',
  cafeId: 'cafe-1',
  cafeName: '테스트 카페',
  authorNickname: '작성자',
  rating: 5,
  text: '창가가 조용합니다.',
  category: '리뷰',
  createdAt: '2026-11-04T00:00:00Z',
  likes: 3,
  liked: false,
  commentCount: 0,
  verified: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockResources).forEach(key => delete mockResources[key]);
  Object.keys(mockReloads).forEach(key => delete mockReloads[key]);
  useSessionStore.setState({ accessToken: null, user: null });
});

const button = (tree: Renderer.ReactTestRenderer, label: string) =>
  tree.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  )[0];
const rendered = (tree: Renderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

test('anonymous readers can view the feed but liking asks for login without writing', async () => {
  mockResources['/api/reviews'] = [review];
  const navigate = jest.fn();
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation: { navigate },
    route: { params: {} },
  } as unknown as React.ComponentProps<typeof CommunityScreen>;
  await act(() => {
    tree = Renderer.create(<CommunityScreen {...props} />);
  });
  expect(rendered(tree!)).toContain('창가가 조용합니다.');
  await act(async () =>
    button(tree!, '작성자님의 글 좋아요 3개').props.onPress(),
  );
  expect(navigate).toHaveBeenCalledWith('Login', {
    returnTo: { name: 'ReviewDetail', params: { reviewId: 'review-1' } },
  });
  expect(api.post).not.toHaveBeenCalled();
  await act(() => tree!.unmount());
});

test('a failed shared like leaves the server count unchanged and shows the error', async () => {
  mockResources['/api/reviews'] = [review];
  useSessionStore.setState({ accessToken: 'test-session' });
  jest
    .mocked(api.post)
    .mockRejectedValueOnce(new Error('서버에 연결하지 못했습니다.'));
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation: { navigate: jest.fn() },
    route: { params: {} },
  } as unknown as React.ComponentProps<typeof CommunityScreen>;
  await act(() => {
    tree = Renderer.create(<CommunityScreen {...props} />);
  });
  await act(async () =>
    button(tree!, '작성자님의 글 좋아요 3개').props.onPress(),
  );
  expect(button(tree!, '작성자님의 글 좋아요 3개')).toBeDefined();
  expect(rendered(tree!)).toContain('서버에 연결하지 못했습니다.');
  expect(api.post).toHaveBeenCalledWith('/api/reviews/review-1/like');
  await act(() => tree!.unmount());
});

test('a server-confirmed shared like updates the displayed count', async () => {
  mockResources['/api/reviews'] = [review];
  useSessionStore.setState({ accessToken: 'test-session' });
  jest
    .mocked(api.post)
    .mockResolvedValueOnce({ ...review, likes: 4, liked: true });
  let tree: Renderer.ReactTestRenderer;
  const props = {
    navigation: { navigate: jest.fn() },
    route: { params: {} },
  } as unknown as React.ComponentProps<typeof CommunityScreen>;
  await act(() => {
    tree = Renderer.create(<CommunityScreen {...props} />);
  });
  await act(async () =>
    button(tree!, '작성자님의 글 좋아요 3개').props.onPress(),
  );
  expect(
    button(tree!, '작성자님의 글 좋아요 4개').props.accessibilityState.selected,
  ).toBe(true);
  await act(() => tree!.unmount());
});

const request = {
  budget: 5000,
  purposes: ['공부·작업'],
  tastes: [],
  travelMode: 'walk',
  travelMinutes: 10,
  query: '',
};
const recommendationProps = {
  navigation: { navigate: jest.fn(), goBack: jest.fn() },
  route: { params: { request } },
} as unknown as React.ComponentProps<typeof RecommendationResultScreen>;

test('rules fallback is identified instead of reporting an AI success', async () => {
  jest.mocked(api.post).mockResolvedValueOnce({ mode: 'rules', items: [] });
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <RecommendationResultScreen {...recommendationProps} />,
    );
  });
  expect(rendered(tree!)).toContain('조건 기반 추천 결과');
  expect(rendered(tree!)).not.toContain('AI 추천 결과');
  expect(rendered(tree!)).toContain('조건에 맞는 카페가 없습니다.');
  await act(() => tree!.unmount());
});

test('recommendation failure offers retry and never invents cafe results', async () => {
  jest
    .mocked(api.post)
    .mockRejectedValueOnce(new Error('추천 서버가 연결되지 않았습니다.'));
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(
      <RecommendationResultScreen {...recommendationProps} />,
    );
  });
  expect(rendered(tree!)).toContain('추천 서버가 연결되지 않았습니다.');
  expect(rendered(tree!)).not.toContain('AI 추천 결과');
  jest.mocked(api.post).mockResolvedValueOnce({ mode: 'rules', items: [] });
  await act(async () => button(tree!, '다시 시도').props.onPress());
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(rendered(tree!)).toContain('조건 기반 추천 결과');
  await act(() => tree!.unmount());
});

function SavedMeetupHarness() {
  const state = useSavedMeetup('meetup-1');
  return <View testID="saved-meetup-state" {...state} />;
}

test('saved meetup hydration cannot be overwritten and UI changes only after durable write', async () => {
  let load!: (value: string | null) => void;
  let acknowledge!: () => void;
  jest.mocked(native.secureGet).mockReturnValueOnce(
    new Promise(resolve => {
      load = resolve;
    }),
  );
  jest.mocked(native.secureSet).mockReturnValueOnce(
    new Promise(resolve => {
      acknowledge = resolve;
    }),
  );
  let tree: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(<SavedMeetupHarness />);
  });
  const state = () =>
    tree!.root.findByProps({ testID: 'saved-meetup-state' }).props;
  await act(async () => state().toggle());
  expect(native.secureSet).not.toHaveBeenCalled();
  await act(async () => load('1'));
  expect(state().saved).toBe(true);
  let pending: Promise<void>;
  await act(() => {
    pending = state().toggle();
  });
  expect(state().saved).toBe(true);
  expect(native.secureSet).toHaveBeenCalledWith(
    'coffee.saved-meetup.meetup-1',
    '0',
  );
  await act(async () => {
    acknowledge();
    await pending;
  });
  expect(state().saved).toBe(false);
  await act(() => tree!.unmount());
});

test('failed meetup save keeps the loaded preference and exposes retryable error', async () => {
  jest.mocked(native.secureGet).mockResolvedValueOnce('1');
  jest
    .mocked(native.secureSet)
    .mockRejectedValueOnce(new Error('기록을 저장하지 못했습니다.'));
  let tree: Renderer.ReactTestRenderer;
  await act(async () => {
    tree = Renderer.create(<SavedMeetupHarness />);
  });
  const state = () =>
    tree!.root.findByProps({ testID: 'saved-meetup-state' }).props;
  await act(async () => state().toggle());
  expect(state().saved).toBe(true);
  expect(state().error).toBe('기록을 저장하지 못했습니다.');
  await act(() => tree!.unmount());
});

test('joined meetup conversation receives another members new message and stops polling after leaving', async () => {
  jest.useFakeTimers();
  useSessionStore.setState({ accessToken: 'test-session' });
  jest.mocked(native.secureGet).mockResolvedValue(null);
  mockResources['/api/meetups/meetup-1'] = {
    id: 'meetup-1',
    title: '함께 공부',
    description: '각자 집중해요.',
    placeName: '동네 카페',
    startsAt: '2027-01-02T14:00:00Z',
    capacity: 4,
    memberCount: 2,
    joined: true,
    category: '카공',
    hostNickname: '모임장',
    members: [],
  };
  const messagesPath = '/api/meetups/meetup-1/messages';
  mockResources[messagesPath] = [];
  const queryClient = new QueryClient();
  const props = {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      isFocused: () => true,
    },
    route: { params: { meetupId: 'meetup-1' } },
  } as unknown as React.ComponentProps<typeof MeetupDetailScreen>;
  const content = () => (
    <QueryClientProvider client={queryClient}>
      <MeetupDetailScreen {...props} />
    </QueryClientProvider>
  );
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = Renderer.create(content());
    });
    expect(rendered(tree!)).not.toContain('곧 도착합니다.');
    mockReloads[messagesPath].mockImplementation(() => {
      mockResources[messagesPath] = [
        {
          id: 'message-2',
          authorNickname: '다른 참여자',
          text: '곧 도착합니다.',
          createdAt: new Date().toISOString(),
        },
      ];
      tree!.update(content());
    });
    await act(async () => jest.advanceTimersByTime(5000));
    expect(rendered(tree!)).toContain('곧 도착합니다.');
    const requests = mockReloads[messagesPath].mock.calls.length;
    await act(() => tree!.unmount());
    await act(async () => jest.advanceTimersByTime(10000));
    expect(mockReloads[messagesPath]).toHaveBeenCalledTimes(requests);
  } finally {
    await act(() => tree!?.unmount());
    queryClient.clear();
    jest.useRealTimers();
  }
});

test('the meetup host confirms cancellation before the server is changed', async () => {
  useSessionStore.setState({
    accessToken: 'test-session',
    user: {
      id: 'host-1',
      nickname: '모임장',
      profileImageUrl: null,
      role: 'USER',
    },
  });
  jest.mocked(native.secureGet).mockResolvedValue(null);
  jest.mocked(api.delete).mockResolvedValueOnce(null);
  mockResources['/api/meetups/meetup-1'] = {
    id: 'meetup-1',
    hostId: 'host-1',
    title: '함께 공부',
    description: '각자 집중해요.',
    placeName: '동네 카페',
    startsAt: '2027-01-02T14:00:00Z',
    capacity: 4,
    memberCount: 2,
    joined: true,
    category: '카공',
    hostNickname: '모임장',
    members: [],
  };
  mockResources['/api/meetups/meetup-1/messages'] = [];
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const queryClient = new QueryClient();
  const popTo = jest.fn();
  const props = {
    navigation: {
      navigate: jest.fn(),
      goBack: jest.fn(),
      popTo,
      isFocused: () => true,
    },
    route: { params: { meetupId: 'meetup-1' } },
  } as unknown as React.ComponentProps<typeof MeetupDetailScreen>;
  let tree: Renderer.ReactTestRenderer;
  try {
    await act(async () => {
      tree = Renderer.create(
        <QueryClientProvider client={queryClient}>
          <MeetupDetailScreen {...props} />
        </QueryClientProvider>,
      );
    });
    await act(async () => button(tree!, '모임 취소').props.onPress());
    expect(api.delete).not.toHaveBeenCalled();
    const confirm = alert.mock.calls[0][2]?.find(
      item => item.style === 'destructive',
    );
    expect(confirm).toBeDefined();
    await act(async () => {
      await confirm?.onPress?.();
    });
    expect(api.delete).toHaveBeenCalledWith('/api/meetups/meetup-1');
    expect(popTo).toHaveBeenCalledWith('Community', { tab: 'meetups' });
  } finally {
    await act(() => tree!?.unmount());
    queryClient.clear();
    alert.mockRestore();
  }
});
