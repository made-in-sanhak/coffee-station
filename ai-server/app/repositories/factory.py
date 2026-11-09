"""One explicit backend switch. No DB access occurs at import time."""
import json
import os
from pathlib import Path

from .base import Cafe, Evidence, Location, MenuOffer, RepositoryError
from .mock import MockRepository
from .mysql import MySQLRepository

ROOT = Path(__file__).resolve().parents[2]


def load_catalog(cursor, cafe_ids, *, is_mock=False):
    """Only these SELECTs/mappings need replacement when the real schema is ready."""
    if not cafe_ids or len(cafe_ids) > 100 or any(type(i) is not int or i <= 0 for i in cafe_ids):
        raise ValueError('Select 1..100 positive integer cafe IDs')
    placeholders = ','.join(['%s'] * len(cafe_ids))
    cursor.execute(f"""SELECT cafe_id AS id, name, address, latitude, longitude,
        NULL AS tags, 'CATALOG' AS source, CONCAT('cafes:', cafe_id) AS source_reference,
        info_verified_at AS verified_at FROM cafes
        WHERE cafe_id IN ({placeholders}) ORDER BY cafe_id LIMIT 1001""", tuple(cafe_ids))
    cafes = cursor.fetchall()
    demo_filter = '' if is_mock else " AND p.source <> 'DEMO'"
    cursor.execute(f"""SELECT p.price_id AS id, p.cafe_id, p.menu_id,
        m.standard_name AS name, m.category, p.size, p.option_name,
        NULL AS temperature, p.price AS price_krw, NULL AS sweetness,
        CASE p.sale_status WHEN 'ON_SALE' THEN 1 WHEN 'SOLD_OUT' THEN 0 ELSE NULL END AS available,
        p.source, CONCAT('menu_prices:', p.price_id) AS source_reference, p.verified_at
        FROM menu_prices p JOIN menus m ON m.menu_id = p.menu_id
        WHERE p.cafe_id IN ({placeholders}) AND p.price_scope = 'STORE'{demo_filter}
        ORDER BY p.price_id LIMIT 1001""", tuple(cafe_ids))
    offers = cursor.fetchall()
    if len(cafes) > 1000 or len(offers) > 1000:
        raise RepositoryError('Selected catalog exceeds 1000 rows; add SQL filtering first')

    def evidence(row):
        return Evidence(row['source'], row['source_reference'], row['verified_at'], is_mock)

    def cafe(row):
        lat, lng = row['latitude'], row['longitude']
        if (lat is None) != (lng is None):
            raise ValueError('Both coordinates must be present or absent')
        tags = json.loads(row['tags']) if isinstance(row['tags'], str) else row['tags']
        if tags is not None and (not isinstance(tags, list) or any(not isinstance(t, str) for t in tags)):
            raise ValueError('tags must be a JSON string array or NULL')
        return Cafe(str(row['id']), row['name'], row['address'],
                    Location(float(lat), float(lng)) if lat is not None else None,
                    tuple(tags) if tags is not None else None, evidence(row))

    def offer(row):
        if row['available'] not in (None, 0, 1):
            raise ValueError('available must be NULL, 0, or 1')
        return MenuOffer(str(row['id']), str(row['cafe_id']), str(row['menu_id']),
                         row['name'], row['category'], row['size'], row['temperature'],
                         row['price_krw'], row['sweetness'],
                         None if row['available'] is None else bool(row['available']), evidence(row), option_name=row.get('option_name', ''))
    return [cafe(r) for r in cafes], [offer(r) for r in offers]


def create_repository(backend='mock', *, mock_path=None, cafe_ids=()):
    if backend == 'mock':
        return MockRepository(mock_path) if mock_path is not None else MockRepository()
    if backend not in ('mysql', 'mysql-demo'):
        raise ValueError('backend must be mock, mysql, or mysql-demo')
    from dotenv import dotenv_values
    import pymysql
    values = {**dotenv_values(ROOT.parent / '.env', interpolate=False),
              **dotenv_values(ROOT / '.env', interpolate=False), **os.environ}
    required = ('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD')
    if any(not values.get(k) for k in required):
        raise ValueError('DB_HOST, DB_NAME, DB_USER, DB_PASSWORD are required')

    def connect():
        return pymysql.connect(host=values['DB_HOST'], port=int(values.get('DB_PORT', '3306')),
            user=values['DB_USER'], password=values['DB_PASSWORD'], database='coffee_station_agent_demo' if backend == 'mysql-demo' else values['DB_NAME'],
            charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5, read_timeout=10, write_timeout=10, autocommit=True)
    return MySQLRepository(connect, lambda cursor: load_catalog(cursor, cafe_ids, is_mock=backend == 'mysql-demo'), allow_mock=backend == 'mysql-demo')
