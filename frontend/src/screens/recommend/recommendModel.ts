import type {
  RecommendationRequest,
  RecommendationResult,
} from '../../app/domain';

export function makeRecommendationRequest(
  input: RecommendationRequest,
): RecommendationRequest {
  return {
    ...input,
    purposes: [...input.purposes],
    tastes: [...input.tastes],
    query: input.query.trim(),
  };
}

export function recommendationHeading(mode: RecommendationResult['mode']) {
  return mode === 'ai' ? 'AI 추천 결과' : '조건 기반 추천 결과';
}

export function requestLabels(request: RecommendationRequest) {
  return [
    request.budget === null
      ? '예산 상관없음'
      : `${request.budget.toLocaleString('ko-KR')}원 이하`,
    ...request.purposes,
    ...request.tastes,
    `${request.travelMode === 'walk' ? '도보' : '차로'} ${
      request.travelMinutes
    }분`,
  ];
}
