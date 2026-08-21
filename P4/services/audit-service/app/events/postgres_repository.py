from psycopg_pool import ConnectionPool

from app.events.models import AuditEvent, NewAuditEvent

COLUMNS = "id, correlation_id, service, action, actor, batch_id, detail, created_at"


def to_event(row) -> AuditEvent:
    return AuditEvent(
        id=row[0],
        correlation_id=row[1],
        service=row[2],
        action=row[3],
        actor=row[4],
        batch_id=row[5],
        detail=row[6],
        created_at=row[7],
    )


class PostgresAuditEventRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def record(self, event: NewAuditEvent) -> AuditEvent:
        with self._pool.connection() as connection:
            row = connection.execute(
                f"""INSERT INTO audit_events (correlation_id, service, action, actor, batch_id, detail)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING {COLUMNS}""",
                (event.correlation_id, event.service, event.action, event.actor, event.batch_id, event.detail),
            ).fetchone()

        return to_event(row)

    def search(self, correlation_id: str | None, service: str | None, batch_id: int | None) -> list[AuditEvent]:
        filters = []
        values: list[object] = []

        if correlation_id is not None:
            filters.append("correlation_id = %s")
            values.append(correlation_id)

        if service is not None:
            filters.append("service = %s")
            values.append(service)

        if batch_id is not None:
            filters.append("batch_id = %s")
            values.append(batch_id)

        where = f"WHERE {' AND '.join(filters)}" if filters else ""

        with self._pool.connection() as connection:
            rows = connection.execute(
                f"SELECT {COLUMNS} FROM audit_events {where} ORDER BY id DESC",
                tuple(values),
            ).fetchall()

        return [to_event(row) for row in rows]
