"""Shared domain contract; SQL schema mapping lives in factory.py.

Prices are integer KRW; distances are straight-line meters. None means unknown,
never zero/false. An empty successful search is distinct from RepositoryError.
"""

from dataclasses import dataclass
from datetime import date
from math import isfinite
from typing import Literal, Protocol


class RepositoryError(RuntimeError):
    """Data could not be read; callers must not interpret this as no matches."""


def _number(value: float, name: str, minimum: float, maximum: float) -> None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    if not isfinite(value) or not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")


@dataclass(frozen=True)
class Location:
    lat: float
    lng: float

    def __post_init__(self) -> None:
        _number(self.lat, "lat", -90, 90)
        _number(self.lng, "lng", -180, 180)


@dataclass(frozen=True)
class Evidence:
    source: str
    reference: str
    verified_at: date | None
    is_mock: bool


@dataclass(frozen=True)
class Cafe:
    id: str
    name: str
    address: str
    location: Location | None
    tags: tuple[str, ...] | None
    evidence: Evidence


@dataclass(frozen=True)
class MenuOffer:
    """One cafe's sellable menu variant, including size and temperature."""

    id: str
    cafe_id: str
    menu_id: str
    name: str
    category: str
    size: str
    temperature: Literal["HOT", "ICE", "NONE"] | None
    price_krw: int | None
    sweetness: Literal["NOT_SWEET", "SWEET"] | None
    available: bool | None
    evidence: Evidence

    option_name: str = ""

    def __post_init__(self) -> None:
        if self.price_krw is not None and (
            type(self.price_krw) is not int or self.price_krw < 0
        ):
            raise ValueError("price_krw must be a nonnegative integer or None")
        if self.temperature not in (None, "HOT", "ICE", "NONE"):
            raise ValueError("invalid temperature")
        if self.sweetness not in (None, "NOT_SWEET", "SWEET"):
            raise ValueError("invalid sweetness")
        if self.available is not None and type(self.available) is not bool:
            raise ValueError("available must be bool or None")


@dataclass(frozen=True)
class SearchFilters:
    """All filters are AND-ed. No constraint is relaxed by the repository.

    None cafe_ids means unrestricted; () means no eligible cafes.
    Tags/category/size use exact values; menu_name uses a casefolded substring.
    Initial catalog searches have a bounded limit, without pagination.
    """

    origin: Location | None = None
    radius_m: float | None = None
    cafe_ids: tuple[str, ...] | None = None
    required_cafe_tags: tuple[str, ...] = ()
    max_price_krw: int | None = None
    menu_name: str | None = None
    category: str | None = None
    size: str | None = None
    temperature: Literal["HOT", "ICE", "NONE"] | None = None
    sweetness: Literal["NOT_SWEET", "SWEET"] | None = None
    sort_by: Literal["id", "distance", "price"] = "id"
    limit: int = 20

    def __post_init__(self) -> None:
        if self.origin is not None and not isinstance(self.origin, Location):
            raise ValueError("origin must be Location")
        if self.radius_m is not None:
            _number(self.radius_m, "radius_m", 0, 20_100_000)
            if self.origin is None:
                raise ValueError("radius_m requires origin")
        if self.sort_by not in ("id", "distance", "price"):
            raise ValueError("invalid sort_by")
        if self.sort_by == "distance" and self.origin is None:
            raise ValueError("distance sorting requires origin")
        if type(self.limit) is not int or not 1 <= self.limit <= 100:
            raise ValueError("limit must be an integer from 1 to 100")
        if self.max_price_krw is not None and (
            type(self.max_price_krw) is not int or self.max_price_krw < 0
        ):
            raise ValueError("max_price_krw must be a nonnegative integer")
        if self.sweetness not in (None, "NOT_SWEET", "SWEET"):
            raise ValueError("invalid sweetness")
        if self.temperature not in (None, "HOT", "ICE", "NONE"):
            raise ValueError("invalid temperature")
        for name in ("cafe_ids", "required_cafe_tags"):
            values = getattr(self, name)
            if values is None and name == "cafe_ids":
                continue
            if not isinstance(values, tuple) or any(
                not isinstance(v, str) or not v.strip() for v in values
            ):
                raise ValueError(f"{name} must be a tuple of nonempty strings")
        for name in ("menu_name", "category", "size"):
            value = getattr(self, name)
            if value is not None and (not isinstance(value, str) or not value.strip()):
                raise ValueError(f"{name} must be a nonempty string")


@dataclass(frozen=True)
class CafeMatch:
    cafe: Cafe
    distance_m: float | None


@dataclass(frozen=True)
class MenuMatch:
    cafe: Cafe
    offer: MenuOffer
    distance_m: float | None


class CatalogRepository(Protocol):
    def search_cafes(self, filters: SearchFilters) -> tuple[CafeMatch, ...]: ...

    def search_menus(self, filters: SearchFilters) -> tuple[MenuMatch, ...]: ...

    def get_cafe_details(self, cafe_id: str) -> Cafe | None: ...
