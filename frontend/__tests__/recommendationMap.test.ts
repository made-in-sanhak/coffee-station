import { selectRecommendationStore } from '../src/api/recommendationMap';
import type { Store } from '../src/types/store';

const store: Store = { id: 7, name: '합성 매장', address: '테스트', latitude: 37, longitude: 127,
  distance: 0, rating: 0, reviewCount: 0, menuName: '테스트', price: 3000, priceSource: 'fixture', priceCheckedAt: '2026-11-09' };
const result = { cafe: { id: 'cafe-1' }, offer: { evidence: { is_mock: false } } };

test('only explicit unique mapping selects an existing store', () => {
  expect(selectRecommendationStore(result, [{ cafeId: 'cafe-1', storeId: 7 }], [store])).toEqual({ status: 'READY', store });
  expect(selectRecommendationStore({ ...result, cafe: { id: '7' } }, [], [store])).toEqual({ status: 'UNAVAILABLE', reason: 'MAPPING_MISSING' });
});
test('mock, ambiguous, missing and invalid coordinates never select a marker', () => {
  const links = [{ cafeId: 'cafe-1', storeId: 7 }];
  expect(selectRecommendationStore({ ...result, offer: { evidence: { is_mock: true } } }, links, [store])).toMatchObject({ reason: 'MOCK_RESULT' });
  expect(selectRecommendationStore(result, [...links, ...links], [store])).toMatchObject({ reason: 'MAPPING_AMBIGUOUS' });
  expect(selectRecommendationStore(result, links, [])).toMatchObject({ reason: 'STORE_MISSING' });
  expect(selectRecommendationStore(result, links, [{ ...store, latitude: 100 }])).toMatchObject({ reason: 'INVALID_COORDINATES' });
});
