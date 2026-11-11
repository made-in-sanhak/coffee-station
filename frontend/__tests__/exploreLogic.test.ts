import type { Cafe } from '../src/app/domain';
import {
  cafePrice,
  filterCafes,
  mergeCafeSources,
  priceSummary,
} from '../src/screens/map/exploreLogic';

const cafe = (id: string, price?: number): Cafe => ({
  id,
  name: `확인된 카페 ${id}`,
  address: '서울시',
  latitude: 37.5,
  longitude: 127,
  distance: Number(id) * 100,
  menus:
    price === undefined
      ? []
      : [
          {
            id: `menu-${id}`,
            cafeId: id,
            name: '아메리카노',
            price,
            size: 'Large',
            temperature: 'ICE',
            caffeineMg: null,
          },
        ],
});

test('an unknown menu price remains unregistered instead of becoming a sample or another menu price', () => {
  expect(cafePrice(cafe('1'), '아이스 아메리카노', 'Large', 'ICE')).toBeNull();
  expect(cafePrice(cafe('1', 2000), '카페라떼', 'Large', 'ICE')).toBeNull();
  expect(cafePrice(cafe('1', 2000), '아이스 아메리카노', 'Large', 'ICE')).toBe(
    2000,
  );
  expect(cafePrice(cafe('1', 2000), '아메리카노', 'Regular', 'ICE')).toBeNull();
});

test('the price filter excludes unregistered prices and applies to the chosen menu', () => {
  const result = filterCafes([cafe('1'), cafe('2', 2500), cafe('3', 4000)], {
    menu: '아메리카노',
    size: 'Large',
    temperature: 'ICE',
    maxPrice: 3000,
    sort: 'price',
  });
  expect(result.map(item => item.id)).toEqual(['2']);
});

test('drive-through and opening filters require actual supplied tags', () => {
  const unknown = cafe('1', 2000);
  const confirmed = { ...cafe('2', 2200), tags: ['드라이브스루', '영업 중'] };
  expect(
    filterCafes([unknown, confirmed], {
      menu: '아메리카노',
      size: 'Large',
      temperature: 'ICE',
      driveThrough: true,
      openOnly: true,
      sort: 'distance',
    }).map(item => item.id),
  ).toEqual(['2']);
});

test('unregistered prices sort after verified prices without mutating the original list', () => {
  const list = [cafe('1'), cafe('2', 3000), cafe('3', 2000)];
  expect(
    filterCafes(list, {
      menu: '아메리카노',
      size: 'Large',
      temperature: 'ICE',
      sort: 'price',
    }).map(item => item.id),
  ).toEqual(['3', '2', '1']);
  expect(list.map(item => item.id)).toEqual(['1', '2', '3']);
});

test('price summaries use actual finite prices and leave an empty set unregistered', () => {
  expect(priceSummary([])).toEqual({
    average: null,
    min: null,
    max: null,
    count: 0,
  });
  expect(priceSummary([1800, 2000, 2200, Number.NaN, Infinity])).toEqual({
    average: 2000,
    min: 1800,
    max: 2200,
    count: 3,
  });
});

test('a confirmed place URL allows server data to enrich the same SDK place', () => {
  const sdk = { ...cafe('42'), name: '조회한 카페', distance: 150, placeUrl:'https://place.map.kakao.com/42' };
  const server = {
    ...cafe('server-42', 2200),
    name: '조회한카페',
    distance: undefined,
    verified: true,
    placeUrl:'https://place.map.kakao.com/42',
  };
  const result = mergeCafeSources([sdk], [server]);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: 'server-42',
    distance: 150,
    verified: true,
  });
  expect(cafePrice(result[0], '아메리카노', 'Large', 'ICE')).toBe(2200);
});

test('same names and nearby coordinates do not prove a Kakao/internal ID mapping', () => {
  const sdk = {...cafe('9001'), placeUrl:'https://place.map.kakao.com/9001'};
  const server = {...cafe('9001',2000)};
  expect(mergeCafeSources([sdk],[server])).toHaveLength(2);
});

test('DB size labels stay exact rather than treating 기본 as Regular', () => {
  const value=cafe('1',2000);
  value.menus![0].size='기본';
  expect(cafePrice(value,'아메리카노','Regular','ICE')).toBeNull();
  expect(cafePrice(value,'아메리카노','기본','ICE')).toBe(2000);
});
