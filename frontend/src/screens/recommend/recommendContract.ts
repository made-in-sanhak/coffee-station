import type { RecommendationRequest } from '../../app/domain';

export interface ProductConditions {
  maxPrice: number | null;
  purpose: 'DRIVE_THRU' | null;
  tastes: Array<'DECAF' | 'MILK'>;
  lat?: number;
  lng?: number;
}

export interface ProductProposal {
  status: 'NEEDS_CLARIFICATION' | 'AWAITING_CONFIRMATION';
  proposalId: string;
  conditions: ProductConditions;
  evidence: Record<string,string>;
  unresolved: string[];
  extractionMode: 'mock' | 'gemini';
}

export function toProductConditions(request: RecommendationRequest): ProductConditions {
  const unknownPurpose = request.purposes.filter(value => value !== '드라이브스루');
  const unknownTaste = request.tastes.filter(value => value !== '디카페인' && value !== '우유 들어간');
  if (unknownPurpose.length || unknownTaste.length) {
    throw new Error('선택한 목적·취향은 아직 검색할 수 없습니다.');
  }
  if (request.purposes.length > 1 || new Set(request.tastes).size !== request.tastes.length) {
    throw new Error('추천 조건을 확인해 주세요.');
  }
  return {
    maxPrice: request.budget,
    purpose: request.purposes.includes('드라이브스루') ? 'DRIVE_THRU' : null,
    tastes: [
      ...(request.tastes.includes('디카페인') ? ['DECAF' as const] : []),
      ...(request.tastes.includes('우유 들어간') ? ['MILK' as const] : []),
    ],
    ...(request.latitude === undefined || request.longitude === undefined ? {} : {
      lat: request.latitude, lng: request.longitude,
    }),
  };
}

export function fromProductConditions(conditions: ProductConditions, query: string): RecommendationRequest {
  return {
    budget: conditions.maxPrice,
    purposes: conditions.purpose === 'DRIVE_THRU' ? ['드라이브스루'] : [],
    tastes: [
      ...(conditions.tastes.includes('DECAF') ? ['디카페인'] : []),
      ...(conditions.tastes.includes('MILK') ? ['우유 들어간'] : []),
    ],
    travelMode:'walk', travelMinutes:0, query,
    ...(conditions.lat === undefined || conditions.lng === undefined ? {} : {
      latitude:conditions.lat,longitude:conditions.lng,
    }),
  };
}
