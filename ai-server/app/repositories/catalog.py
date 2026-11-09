"""Shared queries over a selected, immutable catalog snapshot."""
from math import asin, cos, radians, sin, sqrt

from .base import (
    Cafe, CafeMatch, Location, MenuMatch, MenuOffer,
    RepositoryError, SearchFilters,
)


def distance_m(origin: Location, destination: Location) -> float:
    """Haversine distance; no road routing or walking-time estimate."""
    lat1, lat2 = radians(origin.lat), radians(destination.lat)
    dlat = lat2 - lat1
    dlng = radians(destination.lng - origin.lng)
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 6_371_000 * 2 * asin(sqrt(min(1.0, max(0.0, a))))


class CatalogSnapshot:
    """A small selected catalog, loaded once per instance; recreate to refresh.

    Shared filtering keeps Mock and SQL semantics identical. Not for loading
    a production-wide catalog; SQL-side filtering can replace this later.
    """
    def __init__(self, cafes, offers):
        cafes, offers = tuple(cafes), tuple(offers)
        self._cafes = {c.id: c for c in cafes}
        if len(self._cafes) != len(cafes) or len({o.id for o in offers}) != len(offers):
            raise RepositoryError('Duplicate catalog IDs')
        if any(o.cafe_id not in self._cafes for o in offers):
            raise RepositoryError('Offer refers to an unknown cafe')
        self._offers = offers

    def get_cafe_details(self, cafe_id: str) -> Cafe | None:
        return self._cafes.get(cafe_id)

    def _cafes_matching(self, filters: SearchFilters) -> list[CafeMatch]:
        matches = []
        for cafe in self._cafes.values():
            if filters.cafe_ids is not None and cafe.id not in filters.cafe_ids:
                continue
            if not set(filters.required_cafe_tags).issubset(cafe.tags or ()):
                continue
            distance = (
                distance_m(filters.origin, cafe.location)
                if filters.origin is not None and cafe.location is not None else None
            )
            if filters.radius_m is not None and (
                distance is None or distance > filters.radius_m
            ):
                continue
            matches.append(CafeMatch(cafe, distance))
        return matches

    @staticmethod
    def _has_menu_filters(filters: SearchFilters) -> bool:
        return any(getattr(filters, name) is not None for name in (
            "max_price_krw", "menu_name", "category", "size", "temperature", "sweetness"
        ))

    def search_cafes(self, filters: SearchFilters) -> tuple[CafeMatch, ...]:
        # Reject unsupported constraints instead of silently dropping them.
        if self._has_menu_filters(filters) or filters.sort_by == "price":
            raise ValueError("menu filters and price sorting require search_menus")
        matches = self._cafes_matching(filters)
        matches.sort(key=lambda m: (
            self._distance_key(m.distance_m) if filters.sort_by == "distance" else 0,
            m.cafe.id,
        ))
        return tuple(matches[:filters.limit])

    @staticmethod
    def _distance_key(value: float | None) -> float:
        return float("inf") if value is None else value

    def search_menus(self, filters: SearchFilters) -> tuple[MenuMatch, ...]:
        # Apply the final limit only after all cafe/menu conditions are joined.
        cafes = {m.cafe.id: m for m in self._cafes_matching(filters)}
        matches = []
        for offer in self._offers:
            if offer.cafe_id not in cafes or offer.available is not True:
                continue
            if filters.max_price_krw is not None and (
                offer.price_krw is None or offer.price_krw > filters.max_price_krw
            ):
                continue
            if filters.menu_name is not None and (
                filters.menu_name.strip().casefold() not in offer.name.casefold()
            ):
                continue
            if any(getattr(filters, key) is not None and
                   getattr(filters, key) != getattr(offer, key)
                   for key in ("category", "size", "temperature", "sweetness")):
                continue
            cafe = cafes[offer.cafe_id]
            matches.append(MenuMatch(cafe.cafe, offer, cafe.distance_m))
        def key(match: MenuMatch) -> tuple:
            primary = 0
            if filters.sort_by == "distance":
                primary = self._distance_key(match.distance_m)
            elif filters.sort_by == "price":
                primary = self._distance_key(match.offer.price_krw)
            return primary, match.cafe.id, match.offer.id
        matches.sort(key=key)
        return tuple(matches[:filters.limit])
