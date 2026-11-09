import {
  makeReviewInput,
  makeMeetupInput,
} from '../src/screens/community/socialModel';
import {
  recommendationHeading,
  makeRecommendationRequest,
} from '../src/screens/recommend/recommendModel';

test('review submission requires a selected cafe, whole-star rating and actual text', () => {
  expect(() => makeReviewInput('', 5, '맛있어요', '리뷰')).toThrow('카페');
  expect(() => makeReviewInput('cafe-17', 0, '맛있어요', '리뷰')).toThrow(
    '별점',
  );
  expect(() => makeReviewInput('cafe-17', 4.5, '맛있어요', '리뷰')).toThrow(
    '별점',
  );
  expect(() => makeReviewInput('cafe-17', 4, '   ', '리뷰')).toThrow('내용');
  expect(
    makeReviewInput('cafe-17', 4, '  조용하고 고소해요.  ', '리뷰'),
  ).toEqual({
    cafeId: 'cafe-17',
    rating: 4,
    text: '조용하고 고소해요.',
    category: '리뷰',
  });
});

const draft = {
  title: '같이 공부해요',
  description: '각자 공부할 분을 구합니다.',
  placeName: '동네 카페',
  address: '수원시',
  date: '2026-11-05',
  time: '14:30',
  capacity: '4',
  category: '카공',
};
const now = new Date(2026, 10, 4, 12).getTime();

test('meetup creation rejects invalid dates, past meetings and fractional capacity', () => {
  expect(() => makeMeetupInput({ ...draft, date: '2027-02-30' }, now)).toThrow(
    '날짜',
  );
  expect(() => makeMeetupInput({ ...draft, date: '2026-11-03' }, now)).toThrow(
    '이후',
  );
  expect(() => makeMeetupInput({ ...draft, capacity: '2.5' }, now)).toThrow(
    '인원',
  );
  expect(() => makeMeetupInput({ ...draft, capacity: '1' }, now)).toThrow(
    '인원',
  );
  expect(() => makeMeetupInput({ ...draft, placeName: ' ' }, now)).toThrow(
    '장소',
  );
  expect(makeMeetupInput(draft, now)).toEqual({
    title: draft.title,
    description: draft.description,
    placeName: draft.placeName,
    address: draft.address,
    startsAt: new Date(2026, 10, 5, 14, 30).toISOString(),
    capacity: 4,
    category: '카공',
  });
});

test('the requested recommendation constraints are submitted without an invented result', () => {
  expect(
    makeRecommendationRequest({
      budget: 5000,
      purposes: ['공부·작업'],
      tastes: ['산미 적은'],
      travelMinutes: 10,
      travelMode: 'walk',
      query: '  조용한 곳  ',
    }),
  ).toEqual({
    budget: 5000,
    purposes: ['공부·작업'],
    tastes: ['산미 적은'],
    travelMinutes: 10,
    travelMode: 'walk',
    query: '조용한 곳',
  });
  expect(recommendationHeading('rules')).toBe('조건 기반 추천 결과');
  expect(recommendationHeading('ai')).toBe('AI 추천 결과');
});
