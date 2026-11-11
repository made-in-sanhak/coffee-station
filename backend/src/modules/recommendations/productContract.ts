import { AppError } from '../../common/AppError';

export interface ProductConditions {
  maxPrice: number | null;
  purpose: 'DRIVE_THRU' | null;
  tastes: Array<'DECAF' | 'MILK'>;
  lat?: number;
  lng?: number;
}

export function productConditions(value: unknown): ProductConditions {
  const fail = (): never => { throw new AppError(422, '추천 조건을 확인해 주세요.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !['maxPrice', 'purpose', 'tastes', 'lat', 'lng'].includes(key))) return fail();
  const maxPrice = v.maxPrice ?? null;
  const purpose = v.purpose ?? null;
  const tastes = v.tastes ?? [];
  if (maxPrice !== null && (!Number.isSafeInteger(maxPrice) || Number(maxPrice) < 0)
    || purpose !== null && purpose !== 'DRIVE_THRU'
    || !Array.isArray(tastes) || tastes.length > 2
    || tastes.some(item => item !== 'DECAF' && item !== 'MILK')
    || new Set(tastes).size !== tastes.length
    || (v.lat === undefined) !== (v.lng === undefined)
    || v.lat !== undefined && (typeof v.lat !== 'number' || !Number.isFinite(v.lat) || Math.abs(v.lat) > 90)
    || v.lng !== undefined && (typeof v.lng !== 'number' || !Number.isFinite(v.lng) || Math.abs(v.lng) > 180)) return fail();
  return { maxPrice: maxPrice as number | null, purpose: purpose as ProductConditions['purpose'],
    tastes: tastes as ProductConditions['tastes'],
    ...(v.lat === undefined ? {} : {lat: v.lat as number, lng: v.lng as number}) };
}
