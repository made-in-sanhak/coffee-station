"""Read-only MySQL snapshot adapter; schema-specific SELECTs are injected."""
from .base import RepositoryError
from .catalog import CatalogSnapshot


class MySQLRepository(CatalogSnapshot):
    def __init__(self, connect, load_catalog, *, allow_mock=False):
        """connect() returns a DB-API connection; loader(cursor) returns cafes, offers.

        load_catalog is trusted application code mapping the real schema to Cafe
        and MenuOffer. Never accept SQL or a loader from the model/API caller.
        Use a SELECT-only DB account. No migrations, writes, or Mock fallback.
        """
        connection = None
        try:
            connection = connect()
            cursor = connection.cursor()
            try:
                cursor.execute('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY')
                cafes, offers = load_catalog(cursor)
                cafes, offers = tuple(cafes), tuple(offers)
                if not allow_mock and any(item.evidence.is_mock for item in (*cafes, *offers)):
                    raise ValueError('SQL data must carry non-Mock provenance')
                super().__init__(cafes, offers)
            finally:
                cursor.close()
        except Exception as error:
            raise RepositoryError('Unable to load selected MySQL catalog') from error
        finally:
            if connection is not None:
                try:
                    connection.close()
                except Exception as error:
                    raise RepositoryError('Unable to close MySQL connection') from error
