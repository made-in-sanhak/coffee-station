import type { Store } from '../types/store';

export interface CafeStoreLink { cafeId: string; storeId: number }
export type MapSelection = { status: 'READY'; store: Store }
  | { status: 'UNAVAILABLE'; reason: 'MOCK_RESULT' | 'MAPPING_MISSING' | 'MAPPING_AMBIGUOUS' | 'STORE_MISSING' | 'INVALID_COORDINATES' };

// Integration preparation only. Never infer a map ID or coordinates from a recommendation.
export function selectRecommendationStore(
  recommendation: { cafe: { id?: string }; offer: { evidence: { is_mock: boolean } } },
  links: CafeStoreLink[], stores: Store[],
): MapSelection {
  if (recommendation.offer.evidence.is_mock !== false) { return { status: 'UNAVAILABLE', reason: 'MOCK_RESULT' }; }
  const id = recommendation.cafe.id;
  const matching = links.filter(link => typeof id === 'string' && id.length > 0 && link.cafeId === id);
  if (!matching.length) { return { status: 'UNAVAILABLE', reason: 'MAPPING_MISSING' }; }
  if (matching.length !== 1 || !Number.isSafeInteger(matching[0].storeId) || matching[0].storeId <= 0) {
    return { status: 'UNAVAILABLE', reason: 'MAPPING_AMBIGUOUS' };
  }
  const found = stores.filter(store => store.id === matching[0].storeId);
  if (found.length !== 1) { return { status: 'UNAVAILABLE', reason: 'STORE_MISSING' }; }
  const store = found[0];
  if (!Number.isFinite(store.latitude) || Math.abs(store.latitude) > 90
    || !Number.isFinite(store.longitude) || Math.abs(store.longitude) > 180) {
    return { status: 'UNAVAILABLE', reason: 'INVALID_COORDINATES' };
  }
  return { status: 'READY', store };
}
