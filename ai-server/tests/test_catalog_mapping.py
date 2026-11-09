import unittest
from unittest.mock import Mock
from app.repositories.factory import create_repository, load_catalog


class MappingTests(unittest.TestCase):
    def test_partial_data_and_unknown_values(self):
        evidence = dict(source='MANUAL', source_reference='test', verified_at=None)
        cafe = dict(id='c1', name='Cafe', address='Address', latitude=None,
                    longitude=None, tags='["STUDY"]', **evidence)
        offer = dict(id='o1', cafe_id='c1', menu_id='m1', name='Coffee', category='COFFEE',
                     size='REGULAR', temperature='HOT', price_krw=None, sweetness=None,
                     available=None, **evidence)
        cursor = Mock()
        cursor.fetchall.side_effect = [[cafe], [offer]]
        cafes, offers = load_catalog(cursor, (1,))
        self.assertEqual(cafes[0].tags, ('STUDY',))
        self.assertEqual(cursor.execute.call_args.args[1], (1,))
        self.assertIsNone(cafes[0].location)
        self.assertIsNone(offers[0].available)
        self.assertIsNone(offers[0].price_krw)
        self.assertFalse(offers[0].evidence.is_mock)

    def test_empty_and_invalid_backend(self):
        cursor = Mock()
        cursor.fetchall.side_effect = [[], []]
        self.assertEqual(load_catalog(cursor, (1,)), ([], []))
        with self.assertRaises(ValueError):
            create_repository('invalid')
