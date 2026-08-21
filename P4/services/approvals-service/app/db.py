from pathlib import Path

from psycopg_pool import ConnectionPool

from app.config import settings

pool = ConnectionPool(settings.database_url, min_size=1, max_size=5, open=False)


def bootstrap_database() -> None:
    schema = Path(__file__).parent.joinpath("schema.sql").read_text(encoding="utf-8")
    with pool.connection() as connection:
        connection.execute(schema)
