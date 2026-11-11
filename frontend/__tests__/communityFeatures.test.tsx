import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Image } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, useResource } from '../src/app/api';
import { native } from '../src/app/native';
import { useConfigStore } from '../src/store/configStore';
import { useSessionStore } from '../src/store/sessionStore';
import ReviewWriteScreen from '../src/screens/community/ReviewWriteScreen';
import ReviewDetailScreen from '../src/screens/community/ReviewDetailScreen';
import MeetupCreateScreen from '../src/screens/community/MeetupCreateScreen';
import CommunityScreen from '../src/screens/community/CommunityScreen';
import { env } from '../src/utils/env';

const mockResources: Record<string, unknown> = {};
jest.mock('../src/app/api', () => ({
  api: { post: jest.fn(), get: jest.fn() },
  useResource: jest.fn((path: string) => ({ data: mockResources[path], loading: false, error: null, reload: jest.fn() })),
}));
jest.mock('../src/app/native', () => ({ native: { secureGet: jest.fn(), secureSet: jest.fn(), pickImage: jest.fn(), requestLocation: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
const cafe = { id: 'cafe-1', name: '선택한 카페', address: '서울 마포구', latitude: 37.55, longitude: 126.92 };
const photo = { uri: 'file:///selected.jpg', type: 'image/jpeg', name: 'selected.jpg', base64: '/9j/2Q==' };
const review = { id: 'review-1', cafeId: cafe.id, cafeName: cafe.name, authorNickname: '작성자', rating: 5, text: '경험한 커피 맛', category: '리뷰', createdAt: '2026-11-04T00:00:00Z', likes: 0, liked: false, commentCount: 0, verified: false, imageUrls: ['/api/review-images/11111111-1111-4111-8111-111111111111'] };
const clients: QueryClient[] = [];
const initialMockMode = env.useMockApi;
beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockResources).forEach(key => delete mockResources[key]);
  useConfigStore.setState({ backendUrl: 'https://coffee.example' });
  useSessionStore.setState({ accessToken: 'session', user: null });
});
afterEach(() => { clients.forEach(client => client.clear()); clients.length = 0; env.useMockApi = initialMockMode; });
function button(tree: Renderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
}
async function mount(Screen: React.ComponentType<any>, params = {}) {
  const client = new QueryClient(); clients.push(client);
  const navigation = { navigate: jest.fn(), replace: jest.fn(), isFocused: () => true, goBack: jest.fn() };
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => { tree = Renderer.create(<QueryClientProvider client={client}><Screen route={{ params }} navigation={navigation} /></QueryClientProvider>); });
  return { tree, navigation };
}

test('review creation chooses native photos, removes previews and uploads actual bytes with the review', async () => {
  mockResources['/api/cafes/cafe-1'] = cafe;
  jest.mocked(native.pickImage).mockResolvedValue(photo);
  jest.mocked(api.post).mockResolvedValue(review);
  const { tree, navigation } = await mount(ReviewWriteScreen, { cafeId: cafe.id });
  await act(async () => button(tree, '사진 선택').props.onPress());
  expect(native.pickImage).toHaveBeenCalledWith(false);
  expect(tree.root.findAllByType(Image).some(node => node.props.source?.uri === photo.uri)).toBe(true);
  await act(async () => button(tree, '리뷰 사진 1 삭제').props.onPress());
  expect(tree.root.findAllByType(Image).some(node => node.props.source?.uri === photo.uri)).toBe(false);
  await act(async () => button(tree, '사진 촬영').props.onPress());
  expect(native.pickImage).toHaveBeenLastCalledWith(true);
  const input = tree.root.findAll(node => node.props.multiline && typeof node.props.onChangeText === 'function')[0];
  await act(() => input.props.onChangeText('직접 마신 커피 후기'));
  await act(async () => button(tree, '리뷰 등록').props.onPress());
  expect(api.post).toHaveBeenCalledWith('/api/reviews', expect.objectContaining({ cafeId: cafe.id, text: '직접 마신 커피 후기', images: [{ type: photo.type, base64: photo.base64 }] }));
  expect(navigation.replace).toHaveBeenCalledWith('ReviewDetail', { reviewId: review.id });
  await act(() => tree.unmount());
});

test('cancelled picking keeps the draft and invalid photo types expose a meaningful error', async () => {
  jest.mocked(native.pickImage).mockRejectedValueOnce({ code: 'E_CANCELLED' }).mockResolvedValueOnce({ ...photo, type: 'image/svg+xml' });
  const { tree } = await mount(ReviewWriteScreen);
  await act(async () => button(tree, '사진 선택').props.onPress());
  expect(JSON.stringify(tree.toJSON())).not.toContain('요청을 완료하지 못했습니다.');
  await act(async () => button(tree, '사진 선택').props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain('JPEG 또는 PNG');
  expect(api.post).not.toHaveBeenCalled();
  await act(() => tree.unmount());
});

test('review detail resolves public photo paths against the configured backend', async () => {
  mockResources['/api/reviews/review-1'] = review;
  mockResources['/api/reviews/review-1/comments'] = [];
  const { tree } = await mount(ReviewDetailScreen, { reviewId: review.id });
  expect(tree.root.findAllByType(Image).some(node => node.props.source?.uri === `https://coffee.example${review.imageUrls[0]}`)).toBe(true);
  await act(() => tree.unmount());
});

test('meetup creation searches real cafes and saves the selected cafe identity and address', async () => {
  mockResources['/api/cafes'] = [cafe];
  jest.mocked(api.post).mockResolvedValue({ id: 'meetup-1' });
  const { tree } = await mount(MeetupCreateScreen);
  await act(async () => button(tree, '선택한 카페 선택').props.onPress());
  const fields = tree.root.findAll(node => typeof node.props.onChangeText === 'function' && node.props.label);
  await act(() => {
    fields.find(node => node.props.label === '모임 제목')!.props.onChangeText('함께 공부해요');
    fields.find(node => node.props.label === '모임 소개')!.props.onChangeText('함께 공부할 분');
    fields.find(node => node.props.label === '날짜')!.props.onChangeText('2099-01-01');
  });
  await act(async () => button(tree, '모임 만들기').props.onPress());
  expect(api.post).toHaveBeenCalledWith('/api/meetups', expect.objectContaining({ cafeId: cafe.id, placeName: cafe.name, address: cafe.address }));
  await act(() => tree.unmount());
});

test('owner cafe review entry forces cafe-specific reviews even if a previous meetup tab was requested', async () => {
  mockResources['/api/reviews'] = [];
  const { tree } = await mount(CommunityScreen, { tab: 'meetups', cafeId: cafe.id, cafeName: cafe.name });
  expect(useResource).toHaveBeenCalledWith('/api/reviews', expect.objectContaining({ cafeId: cafe.id }), true);
  expect(useResource).toHaveBeenCalledWith('/api/meetups', expect.anything(), false);
  expect(JSON.stringify(tree.toJSON())).toContain(cafe.name);
  await act(() => tree.unmount());
});

test('nearby meetup filtering requests location only on demand and passes a real 1km radius', async () => {
  jest.mocked(native.requestLocation).mockResolvedValue({ latitude: 37.55, longitude: 126.92 });
  const { tree } = await mount(CommunityScreen, { tab: 'meetups' });
  expect(native.requestLocation).not.toHaveBeenCalled();
  await act(async () => button(tree, '내 주변 1km').props.onPress());
  expect(useResource).toHaveBeenCalledWith('/api/meetups', expect.objectContaining({ latitude: 37.55, longitude: 126.92, radius: 1000 }), true);
  await act(async () => button(tree, '내 주변 1km').props.onPress());
  expect(useResource).toHaveBeenLastCalledWith('/api/meetups', expect.objectContaining({ radius: undefined }), true);
  await act(() => tree.unmount());
});

test('preview review and meetup actions explain the service boundary without reopening login', async () => {
  env.useMockApi = true;
  useSessionStore.setState({ accessToken: null, user: null });
  for (const [tab, label] of [['reviews', '커피 리뷰 쓰기'], ['meetups', '모임 만들기']]) {
    const { tree, navigation } = await mount(CommunityScreen, { tab });
    await act(() => button(tree, label).props.onPress());
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('미리보기');
    await act(() => tree.unmount());
  }
});

test('service login retains the requested meetup composer destination', async () => {
  env.useMockApi = false;
  useSessionStore.setState({ accessToken: null, user: null });
  const { tree, navigation } = await mount(CommunityScreen, { tab: 'meetups' });
  await act(() => button(tree, '모임 만들기').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('Login', {
    returnTo: { name: 'MeetupCreate', params: undefined },
  });
  expect(api.post).not.toHaveBeenCalled();
  await act(() => tree.unmount());
});
