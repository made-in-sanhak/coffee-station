import { Conditions, conditions } from './contracts';
import { Recommendation } from './repository';

export interface ReviewFeature {
  cafeId: string; revision: number; currentRevision: number;
  opinions: Array<{ reviewId: string; topic: 'noise' | 'seating' | 'other'; sentiment: 'positive' | 'negative' | 'neutral' }>;
}
export interface RankingExperiment {
  order: 'price' | 'distance' | 'relevance';
  topic?: 'noise' | 'seating';
  preferredCategory?: string;
  weights: { review: number; preference: number };
  smoothing: number;
}

// Experimental local ranking. No HTTP mode is changed by this module.
export function rankCandidates(candidates: Recommendation[], input: Conditions,
  features: ReviewFeature[], experiment: RankingExperiment) {
  const c = conditions(input);
  if (!['price', 'distance', 'relevance'].includes(experiment.order)
    || Object.values(experiment.weights).some(v => !Number.isFinite(v) || v < 0)
    || !Number.isFinite(experiment.smoothing) || experiment.smoothing <= 0) { throw new Error('Invalid ranking experiment'); }
  const valid = candidates.filter(r => Number.isSafeInteger(r.offer.price_krw) && r.offer.price_krw >= 0
    && (c.max_price_krw === null || r.offer.price_krw <= c.max_price_krw)
    && (c.category === null || r.offer.category === c.category)
    && (r.distance_m === null || Number.isFinite(r.distance_m) && r.distance_m >= 0)
    && (c.radius_m === undefined || r.distance_m !== null && r.distance_m <= c.radius_m)
    && (experiment.order !== 'distance' || r.distance_m !== null));
  const ranked = valid.map(candidate => {
    const matches = features.filter(f => f.cafeId === candidate.cafe.id);
    const f = matches.length === 1 ? matches[0] : undefined;
    const usable = f && Number.isSafeInteger(f.revision) && f.revision >= 0 && f.revision === f.currentRevision;
    // Count each review once per topic; contradictory duplicate labels do not become votes.
    const votes = new Map<string, Set<string>>();
    if (usable && experiment.topic) {
      for (const o of f.opinions) {
        if (o.topic !== experiment.topic || !o.reviewId || !['positive','negative','neutral'].includes(o.sentiment)) { continue; }
        const sentiments = votes.get(o.reviewId) ?? new Set<string>(); sentiments.add(o.sentiment); votes.set(o.reviewId, sentiments);
      }
    }
    let positive = 0, negative = 0;
    for (const labels of votes.values()) {
      if (labels.size !== 1) { continue; }
      if (labels.has('positive')) { positive++; } else if (labels.has('negative')) { negative++; }
    }
    const review = (positive - negative) / (positive + negative + experiment.smoothing);
    const preference = experiment.preferredCategory === candidate.offer.category ? 1 : 0;
    const score = review * experiment.weights.review + preference * experiment.weights.preference;
    return { ...candidate, ranking: { score, review, preference, positive, negative,
      mixedOpinions: positive > 0 && negative > 0, reviewAvailable: Boolean(usable && votes.size) } };
  });
  return ranked.sort((a,b) => (experiment.order === 'price' ? a.offer.price_krw-b.offer.price_krw
    : experiment.order === 'distance' ? a.distance_m! - b.distance_m! : b.ranking.score-a.ranking.score)
    || a.offer.price_krw-b.offer.price_krw || a.offer.id.localeCompare(b.offer.id)).slice(0,c.limit);
}
