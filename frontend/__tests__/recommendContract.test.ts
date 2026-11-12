import {toProductConditions,fromProductConditions} from '../src/screens/recommend/recommendContract';
import type {RecommendationRequest} from '../src/app/domain';

const request: RecommendationRequest = {
  budget: 5000, purposes: [], tastes: [], travelMinutes: 10, travelMode: 'walk', query: '',
};

test('supported chips map to the DB request without a natural-language field', () => {
  expect(toProductConditions({...request, purposes:['드라이브스루'], tastes:['디카페인','우유 들어간'],
    latitude:37.62,longitude:126.83})).toEqual({maxPrice:5000,purpose:'DRIVE_THRU',
    tastes:['DECAF','MILK'],lat:37.62,lng:126.83});
});

test('review-derived preferences are rejected rather than silently dropped', () => {
  expect(() => toProductConditions({...request,purposes:['공부·작업']})).toThrow('아직 검색');
  expect(() => toProductConditions({...request,tastes:['산미 적은']})).toThrow('아직 검색');
});

test('natural-language result labels use confirmed conditions rather than old chips', () => {
  const confirmed=fromProductConditions({maxPrice:3000,purpose:null,tastes:['DECAF']},'3천원 디카페인');
  expect(confirmed.budget).toBe(3000);
  expect(confirmed.tastes).toEqual(['디카페인']);
  expect(confirmed.purposes).toEqual([]);
});
