import os
import sys
from datetime import datetime, timedelta, timezone

import psycopg

GMT_MENOS_6 = timezone(timedelta(hours=-6))


def main() -> int:
    database_url = os.environ["DATABASE_URL"]
    carne = os.environ["CARNE"]
    ejecutado_en = datetime.now(GMT_MENOS_6)

    with psycopg.connect(database_url) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ejecuciones_cronjob (
              id SERIAL PRIMARY KEY,
              carne TEXT NOT NULL,
              ejecutado_en TIMESTAMPTZ NOT NULL
            )
            """
        )
        connection.execute(
            "INSERT INTO ejecuciones_cronjob (carne, ejecutado_en) VALUES (%s, %s)",
            (carne, ejecutado_en),
        )
        connection.commit()

    print(f"Registro insertado: carne={carne} ejecutado_en={ejecutado_en.isoformat()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
