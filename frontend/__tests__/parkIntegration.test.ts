import { mapParkPreferences } from '../src/integration/parkPreferences';
import { classifyParkSession } from '../src/integration/parkSession';

test('Park menu, Large size, purpose, cafe and taste selections reach Map unchanged', () => {
  expect(mapParkPreferences({
    brands: ['아이스 아메리카노', '카페라떼'], size: 'Large',
    orderMethod: '드라이브스루', cafeType: '개인 카페', tastes: ['고소한'],
  })).toEqual({
    menus: ['아이스 아메리카노', '카페라떼'], sizes: ['Large'],
    purposes: ['드라이브스루'], cafeTypes: ['개인 카페'], tastes: ['고소한'],
    priceMax: null, temperatures: ['ICE'], travelMode: 'walk', travelMinutes: 10,
  });
});

test('skipped and sparse initial selections keep valid local defaults', () => {
  expect(mapParkPreferences(null)).toMatchObject({ menus: ['아메리카노'], sizes: ['기본'], tastes: [] });
  expect(mapParkPreferences({ brands: [], size: 'Regular', orderMethod: '', cafeType: '', tastes: [] }))
    .toMatchObject({ menus: ['아메리카노'], sizes: ['Regular'], purposes: [], cafeTypes: [] });
});

test('the pre-existing Park mock session never becomes a private service identity', () => {
  expect(classifyParkSession({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token',
    user: { id: 1, nickname: '테스트 사용자', profileImageUrl: null } })).toBeNull();
});

test('real Park service response keeps token and string ID with least privilege', () => {
  expect(classifyParkSession({ accessToken: 'service-access', refreshToken: 'service-refresh',
    user: { id: 42, nickname: '회원', profileImageUrl: null } })).toEqual({
    accessToken: 'service-access', refreshToken: 'service-refresh',
    user: { id: '42', nickname: '회원', profileImageUrl: null, role: 'USER' },
  });
});

test('missing tokens and malformed Park users remain unauthenticated', () => {
  expect(classifyParkSession({ accessToken: null, refreshToken: null, user: null })).toBeNull();
  expect(classifyParkSession({ accessToken: 'service', refreshToken: 'refresh',
    user: { id: NaN, nickname: '회원', profileImageUrl: null } })).toBeNull();
});
