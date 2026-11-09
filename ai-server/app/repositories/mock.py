"""Read-only synthetic catalog. Never falls back from a broken data source."""

import json
from pathlib import Path

from .base import Cafe, Evidence, Location, MenuOffer, RepositoryError
from .catalog import CatalogSnapshot, distance_m


DEFAULT_CATALOG = Path(__file__).resolve().parents[2] / "fixtures" / "catalog.json"


class MockRepository(CatalogSnapshot):
    def __init__(self, path: Path = DEFAULT_CATALOG) -> None:
        try:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
            if data["is_mock"] is not True:
                raise ValueError("mock catalog must declare is_mock=true")
            evidence = Evidence("MOCK", data["description"], None, True)
            cafes = []
            for row in data["cafes"]:
                row = dict(row)
                row["location"] = Location(**row["location"]) if row["location"] else None
                row["tags"] = tuple(row["tags"]) if row["tags"] is not None else None
                cafes.append(Cafe(**row, evidence=evidence))
            offers = [MenuOffer(**row, evidence=evidence) for row in data["offers"]]
            super().__init__(cafes, offers)
        except (OSError, ValueError, TypeError, KeyError) as exc:
            raise RepositoryError("Unable to load mock catalog") from exc
