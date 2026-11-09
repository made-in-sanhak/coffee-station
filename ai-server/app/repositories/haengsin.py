"""Read-only price comparison over supplied staging data, not verified offers."""
from contextlib import closing
from pathlib import Path
import os


def connect():
    import pymysql
    from dotenv import dotenv_values
    root = Path(__file__).resolve().parents[2]
    values = {**dotenv_values(root.parent / '.env', interpolate=False),
              **dotenv_values(root / '.env', interpolate=False), **os.environ}
    return pymysql.connect(host=values.get('DB_HOST', '127.0.0.1'),
        port=int(values.get('DB_PORT', '3306')), user=values['DB_USER'], password=values['DB_PASSWORD'],
        database='coffee_station_haengsin_test', charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor, connect_timeout=5, read_timeout=10, write_timeout=10)


def search_prices(*, menu_name, max_price=None, temperature=None, size=None, store_code=None,
                  include_unverified=False, connection_factory=connect):
    if menu_name not in ('아메리카노', '카페라떼'):
        raise ValueError('Supported menus: 아메리카노, 카페라떼')
    if max_price is not None and (type(max_price) is not int or max_price < 0):
        raise ValueError('Nonnegative integer price required')
    if temperature not in (None, 'HOT', 'ICE'):
        raise ValueError('HOT or ICE required')
    clauses, params = ['p.menu_name=%s', 'p.price_won IS NOT NULL'], [menu_name]
    for column, value, operator in [('price_won', max_price, '<='), ('temperature', temperature, '='),
                                    ('size_label', size, '='), ('store_code', store_code, '=')]:
        if value is not None:
            clauses.append(f'p.{column}{operator}%s')
            params.append(value)
    if not include_unverified:
        clauses.append("p.price_basis <> 'unverified' AND p.source_url IS NOT NULL")
    sql = '''SELECT s.store_name, s.latitude, s.longitude, p.*
             FROM import_haengsin_prices p JOIN import_haengsin_stores s USING(store_code)
             WHERE ''' + ' AND '.join(clauses) + ' ORDER BY p.price_won, p.import_row_id'
    with closing(connection_factory()) as db, closing(db.cursor()) as cursor:
        cursor.execute('START TRANSACTION READ ONLY')
        cursor.execute(sql, tuple(params))
        return cursor.fetchall()


def cheapest_by_store(rows):
    """Input must be price sorted. Preserve which option produced the minimum."""
    selected = {}
    for row in rows:
        selected.setdefault(row['store_code'], row)
    return list(selected.values())
