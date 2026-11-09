import type { Deal, Event } from '../../app/domain';

export function selectPromotion(events: Event[], deals: Deal[], now: number) {
  for (const event of events) {
    if (!event.dealId || (event.endsAt && Date.parse(event.endsAt) <= now))
      continue;
    const deal = deals.find(
      item =>
        item.id === event.dealId &&
        item.active &&
        item.stock > 0 &&
        Date.parse(item.startsAt) <= now &&
        Date.parse(item.endsAt) > now,
    );
    if (deal) return { event, deal };
  }
  return { event: undefined, deal: undefined };
}
