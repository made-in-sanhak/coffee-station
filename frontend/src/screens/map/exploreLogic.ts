import type { Cafe } from '../../app/domain';

export type CafeSort = 'price' | 'distance' | 'rating';
export interface CafeFilters {
  menu: string;
  size: string;
  temperature: string;
  driveThrough?: boolean;
  openOnly?: boolean;
  maxPrice?: number | null;
  sort: CafeSort;
}

const canonicalMenu = (value: string) =>
  value
    .replace(/^(아이스|ICE)\s*/i, '')
    .replace(/\s/g, '')
    .toLowerCase();
const canonicalSize = (value: string) =>
  value === '기본' ? 'regular' : value.toLowerCase();

export function mergeCafeSources(
  sdkCafes: Cafe[],
  serverCafes: Cafe[],
): Cafe[] {
  const merged = new Map(sdkCafes.map(cafe => [cafe.id, cafe]));
  for (const cafe of serverCafes) {
    const match = [...merged.values()].find(
      item =>
        item.id === cafe.id ||
        (!!cafe.placeUrl && item.placeUrl === cafe.placeUrl) ||
        (item.name.replace(/\s/g, '') === cafe.name.replace(/\s/g, '') &&
          Math.abs(item.latitude - cafe.latitude) < 0.0002 &&
          Math.abs(item.longitude - cafe.longitude) < 0.0002),
    );
    if (match) merged.delete(match.id);
    merged.set(cafe.id, {
      ...match,
      ...cafe,
      distance: cafe.distance ?? match?.distance,
    });
  }
  return [...merged.values()];
}

export function cafePrice(
  cafe: Cafe,
  menu: string,
  size: string,
  temperature: string,
): number | null {
  const prices = (cafe.menus ?? [])
    .filter(
      item =>
        item.available !== false &&
        canonicalMenu(item.name) === canonicalMenu(menu) &&
        canonicalSize(item.size) === canonicalSize(size) &&
        item.temperature === temperature &&
        Number.isFinite(item.price) &&
        item.price >= 0,
    )
    .map(item => item.price);
  return prices.length ? Math.min(...prices) : null;
}

export function filterCafes(cafes: Cafe[], filters: CafeFilters): Cafe[] {
  const price = (cafe: Cafe) =>
    cafePrice(cafe, filters.menu, filters.size, filters.temperature);
  return cafes
    .filter(cafe => {
      const tags = cafe.tags ?? [];
      if (
        filters.driveThrough &&
        !tags.some(tag => ['DT', '드라이브스루'].includes(tag))
      )
        return false;
      if (
        filters.openOnly &&
        !tags.some(tag => ['OPEN', '영업 중'].includes(tag))
      )
        return false;
      const value = price(cafe);
      return (
        filters.maxPrice == null ||
        (value !== null && value <= filters.maxPrice)
      );
    })
    .sort((left, right) => {
      if (filters.sort === 'price')
        return (
          (price(left) ?? Infinity) - (price(right) ?? Infinity) ||
          (left.distance ?? Infinity) - (right.distance ?? Infinity)
        );
      if (filters.sort === 'rating')
        return (
          (right.rating ?? -1) - (left.rating ?? -1) ||
          (left.distance ?? Infinity) - (right.distance ?? Infinity)
        );
      return (left.distance ?? Infinity) - (right.distance ?? Infinity);
    });
}

export function priceSummary(values: number[]) {
  const prices = values.filter(price => Number.isFinite(price) && price >= 0);
  return {
    average: prices.length
      ? Math.round(
          prices.reduce((sum, price) => sum + price, 0) / prices.length,
        )
      : null,
    min: prices.length ? Math.min(...prices) : null,
    max: prices.length ? Math.max(...prices) : null,
    count: prices.length,
  };
}

export const distanceLabel = (distance?: number) =>
  distance == null
    ? '거리 정보 없음'
    : distance >= 1000
    ? `${(distance / 1000).toFixed(1)}km`
    : `${Math.round(distance)}m`;

export const MENU_CHOICES = [
  '아이스 아메리카노',
  '카페라떼',
  '콜드브루',
  '바닐라라떼',
  '카푸치노',
  '디카페인 아메리카노',
  '카라멜 마키아또',
  '아인슈페너',
];
