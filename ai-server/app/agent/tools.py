from dataclasses import asdict, replace
from datetime import date

from app.repositories.base import SearchFilters


PROPERTIES = {
    "cafe_ids": {"type": "array", "items": {"type": "string"}},
    "required_cafe_tags": {"type": "array", "items": {"type": "string"}},
    "max_price_krw": {"type": "integer"},
    "radius_m": {"type": "number"},
    "menu_name": {"type": "string"}, "category": {"type": "string"},
    "size": {"type": "string"},
    "temperature": {"type": "string", "enum": ["HOT", "ICE", "NONE"]},
    "sweetness": {"type": "string", "enum": ["NOT_SWEET", "SWEET"]},
    "sort_by": {"type": "string", "enum": ["id", "price", "distance"]},
    "limit": {"type": "integer"},
}
CAFE_KEYS = {"cafe_ids", "required_cafe_tags", "radius_m", "sort_by", "limit"}
DECLARATIONS = [
    {"name": name, "description": description,
     "parameters": {"type": "object", "properties": properties}}
    for name, description, properties in (
        ("search_cafes", "Search catalog cafes by location and purpose tags.",
         {k: v for k, v in PROPERTIES.items() if k in CAFE_KEYS}),
        ("search_menus", "Search sellable catalog menu variants; required for recommendations.", PROPERTIES),
        ("get_cafe_details", "Retrieve one catalog cafe's details.", {"cafe_id": {"type": "string"}}),
    )
]


def merge_filters(confirmed: SearchFilters, arguments: dict, cafe_only=False):
    allowed = CAFE_KEYS if cafe_only else set(PROPERTIES)
    if not isinstance(arguments, dict) or set(arguments) - allowed:
        raise ValueError("Unknown tool arguments")
    values = dict(arguments)
    for name in ("cafe_ids", "required_cafe_tags"):
        if name in values:
            if not isinstance(values[name], list):
                raise ValueError("List argument required")
            values[name] = tuple(values[name])
    # Validate proposed types before comparing numeric bounds.
    proposed = replace(confirmed, **values)
    for name in ("max_price_krw", "radius_m"):
        original = getattr(confirmed, name)
        if original is not None and (getattr(proposed, name) is None or getattr(proposed, name) > original):
            raise ValueError("Cannot relax a confirmed constraint")
    for name in ("menu_name", "category", "size", "temperature", "sweetness"):
        original = getattr(confirmed, name)
        if original is not None and getattr(proposed, name) != original:
            raise ValueError("Cannot change a confirmed constraint")
    if not set(confirmed.required_cafe_tags).issubset(proposed.required_cafe_tags):
        raise ValueError("Cannot remove required cafe tags")
    if confirmed.cafe_ids is not None and (
        proposed.cafe_ids is None or not set(proposed.cafe_ids).issubset(confirmed.cafe_ids)
    ):
        raise ValueError("Cannot widen confirmed cafe scope")
    if cafe_only:
        # Cafe metadata discovery need not apply menu filters; final offers still must.
        proposed = SearchFilters(origin=proposed.origin, radius_m=proposed.radius_m,
            cafe_ids=proposed.cafe_ids, required_cafe_tags=proposed.required_cafe_tags,
            sort_by="distance" if proposed.sort_by == "distance" else "id", limit=proposed.limit)
    return proposed


def tool_data(value):
    """Serialize SQL DATE evidence without changing the domain objects."""
    return asdict(value, dict_factory=lambda pairs: {
        key: item.isoformat() if isinstance(item, date) else item for key, item in pairs
    })


def execute_tool(repo, call, constraints, candidate_offer_ids=None):
    if call.name == "get_cafe_details":
        if set(call.arguments) != {"cafe_id"} or not isinstance(call.arguments["cafe_id"], str):
            raise ValueError("cafe_id string required")
        cafe = repo.get_cafe_details(call.arguments["cafe_id"])
        return {"status": "ok", "item": tool_data(cafe) if cafe else None}, ()
    if call.name not in ("search_cafes", "search_menus"):
        raise ValueError("Unknown tool")
    filters = merge_filters(constraints, call.arguments, call.name == "search_cafes")
    if call.name == "search_cafes":
        matches = repo.search_cafes(filters)
        return {"status": "ok", "items": [tool_data(m) for m in matches]}, ()
    # The prototype repository has no pagination and caps queries at 100.
    # Filter the previous subset before applying the requested presentation limit.
    matches = repo.search_menus(replace(filters, limit=100) if candidate_offer_ids is not None else filters)
    if candidate_offer_ids is not None:
        matches = tuple(m for m in matches if m.offer.id in candidate_offer_ids)[:filters.limit]
    return {"status": "ok", "items": [tool_data(m) for m in matches]}, matches
