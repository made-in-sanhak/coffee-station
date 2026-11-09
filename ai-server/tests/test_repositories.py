import json
import tempfile
import unittest
from pathlib import Path

from app.repositories.base import Location, RepositoryError, SearchFilters
from app.repositories.mock import DEFAULT_CATALOG, MockRepository, distance_m


class MockRepositoryTests(unittest.TestCase):
    def setUp(self):
        self.repo = MockRepository()
        self.origin = Location(37.63, 126.83)

    def test_price_boundary_and_variants(self):
        matches = self.repo.search_menus(SearchFilters(
            cafe_ids=("mock-cafe-1",), menu_name="라떼", max_price_krw=5000,
            sweetness="NOT_SWEET",
        ))
        self.assertEqual([m.offer.id for m in matches], ["offer-2"])
        self.assertEqual(matches[0].offer.price_krw, 5000)
        self.assertEqual(matches[0].offer.size, "REGULAR")

    def test_combined_filters_never_relax_conditions(self):
        matches = self.repo.search_menus(SearchFilters(
            origin=self.origin, radius_m=500, required_cafe_tags=("STUDY",),
            max_price_krw=5000, sweetness="NOT_SWEET", category="COFFEE",
            temperature="ICE", size="REGULAR",
        ))
        self.assertEqual([m.offer.id for m in matches], ["offer-1"])

    def test_unknown_sweetness_does_not_mean_not_sweet(self):
        matches = self.repo.search_menus(SearchFilters(sweetness="NOT_SWEET"))
        self.assertTrue(matches)
        self.assertTrue(all(m.offer.sweetness == "NOT_SWEET" for m in matches))

    def test_unknown_price_and_availability(self):
        all_matches = self.repo.search_menus(SearchFilters())
        self.assertIn("offer-7", [m.offer.id for m in all_matches])
        self.assertNotIn("offer-5", [m.offer.id for m in all_matches])
        self.assertNotIn("offer-10", [m.offer.id for m in all_matches])
        priced = self.repo.search_menus(SearchFilters(max_price_krw=10000))
        self.assertTrue(all(m.offer.price_krw is not None for m in priced))

    def test_radius_boundary_and_missing_location(self):
        cafe = self.repo.get_cafe_details("mock-cafe-2")
        boundary = distance_m(self.origin, cafe.location)
        self.assertAlmostEqual(boundary, 333.585, places=2)
        at = self.repo.search_cafes(SearchFilters(origin=self.origin, radius_m=boundary))
        below = self.repo.search_cafes(SearchFilters(origin=self.origin, radius_m=boundary - 0.01))
        self.assertEqual([m.cafe.id for m in at], ["mock-cafe-1", "mock-cafe-2"])
        self.assertEqual([m.cafe.id for m in below], ["mock-cafe-1"])
        zero = self.repo.search_cafes(SearchFilters(origin=self.origin, radius_m=0))
        self.assertEqual([m.cafe.id for m in zero], ["mock-cafe-1"])

    def test_distance_sort_unknown_last(self):
        matches = self.repo.search_cafes(SearchFilters(origin=self.origin, sort_by="distance"))
        self.assertEqual([m.cafe.id for m in matches], [
            "mock-cafe-1", "mock-cafe-2", "mock-cafe-3", "mock-cafe-4"
        ])
        self.assertIsNone(matches[-1].distance_m)

    def test_price_sort_limit_after_join_and_unknown_last(self):
        matches = self.repo.search_menus(SearchFilters(sort_by="price", limit=1))
        self.assertEqual(matches[0].offer.id, "offer-8")
        matches = self.repo.search_menus(SearchFilters(sort_by="price"))
        self.assertIsNone(matches[-1].offer.price_krw)

    def test_followup_candidate_scope(self):
        matches = self.repo.search_menus(SearchFilters(
            cafe_ids=("mock-cafe-1", "mock-cafe-2"), menu_name="라떼",
            sweetness="NOT_SWEET", origin=self.origin, sort_by="distance",
        ))
        self.assertEqual([m.offer.id for m in matches], ["offer-2", "offer-3", "offer-6"])
        self.assertEqual(self.repo.search_menus(SearchFilters(cafe_ids=())), ())

    def test_empty_results_and_missing_details(self):
        self.assertEqual(self.repo.search_menus(SearchFilters(max_price_krw=1)), ())
        self.assertIsNone(self.repo.get_cafe_details("missing"))
        self.assertEqual(self.repo.search_cafes(SearchFilters(required_cafe_tags=("UNKNOWN",))), ())

    def test_mock_provenance(self):
        for match in self.repo.search_menus(SearchFilters()):
            for evidence in (match.cafe.evidence, match.offer.evidence):
                self.assertTrue(evidence.is_mock)
                self.assertEqual(evidence.source, "MOCK")
                self.assertIsNone(evidence.verified_at)

    def test_reject_unsupported_cafe_filters(self):
        for filters in (SearchFilters(max_price_krw=5000), SearchFilters(sort_by="price")):
            with self.subTest(filters=filters), self.assertRaises(ValueError):
                self.repo.search_cafes(filters)

    def test_invalid_query_inputs(self):
        cases = [dict(radius_m=500), dict(sort_by="distance"), dict(limit=0),
                 dict(limit=101), dict(limit=True), dict(max_price_krw=-1),
                 dict(max_price_krw=3.5), dict(max_price_krw=True),
                 dict(sweetness="UNKNOWN"), dict(temperature="WARM"),
                 dict(cafe_ids="mock-cafe-1"), dict(menu_name=" "),
                 dict(origin=self.origin, radius_m=float("nan")),
                 dict(origin=self.origin, radius_m=-1)]
        for case in cases:
            with self.subTest(case=case), self.assertRaises(ValueError):
                SearchFilters(**case)
        for lat, lng in [(91, 0), (0, 181), (float("nan"), 0), (True, 0)]:
            with self.subTest(lat=lat, lng=lng), self.assertRaises(ValueError):
                Location(lat, lng)

    def test_broken_catalog_is_error_not_empty_result(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as directory:
            path = Path(directory) / "catalog.json"
            with self.assertRaises(RepositoryError):
                MockRepository(path)
            path.write_text("broken json", encoding="utf-8")
            with self.assertRaises(RepositoryError):
                MockRepository(path)
            for mutation in ("duplicate", "orphan", "not_mock"):
                data = json.loads(DEFAULT_CATALOG.read_text(encoding="utf-8"))
                if mutation == "duplicate":
                    data["cafes"].append(data["cafes"][0])
                elif mutation == "orphan":
                    data["offers"][0]["cafe_id"] = "missing"
                else:
                    data["is_mock"] = False
                path.write_text(json.dumps(data), encoding="utf-8")
                with self.subTest(mutation=mutation), self.assertRaises(RepositoryError):
                    MockRepository(path)


if __name__ == "__main__":
    unittest.main()
