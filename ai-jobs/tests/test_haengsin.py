import unittest
from unittest.mock import Mock
from app.repositories.haengsin import search_prices, cheapest_by_store


class HaengsinTests(unittest.TestCase):
    def test_bound_filters_and_closed_connection(self):
        db = Mock()
        cursor = db.cursor.return_value
        cursor.fetchall.return_value = []
        search_prices(menu_name='아메리카노', max_price=4000, temperature='ICE',
                      size="x' OR 1=1", connection_factory=lambda: db)
        sql, params = cursor.execute.call_args.args
        self.assertNotIn("x' OR", sql)
        self.assertEqual(params, ('아메리카노', 4000, 'ICE', "x' OR 1=1"))
        self.assertIn("price_basis <> 'unverified'", sql)
        db.close.assert_called_once()
        cursor.close.assert_called_once()

    def test_invalid_filters_do_not_connect(self):
        connect = Mock()
        with self.assertRaises(ValueError):
            search_prices(menu_name='아메리카노', max_price=-1, connection_factory=connect)
        connect.assert_not_called()

    def test_store_minimum_keeps_option(self):
        rows = [dict(store_code='A', price_won=1000, size_label='Small'),
                dict(store_code='B', price_won=1500, size_label='Large'),
                dict(store_code='A', price_won=2000, size_label='Large')]
        self.assertEqual(cheapest_by_store(rows), rows[:2])
