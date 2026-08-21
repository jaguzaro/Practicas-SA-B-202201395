from psycopg_pool import ConnectionPool

from app.approvals.models import Approval, ApprovalStep, NewApprovalStep


class PostgresApprovalRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def find_by_batch(self, batch_id: int) -> Approval | None:
        with self._pool.connection() as connection:
            row = connection.execute(
                "SELECT id, batch_id, status, created_at, updated_at FROM approvals WHERE batch_id = %s",
                (batch_id,),
            ).fetchone()

            if row is None:
                return None

            return self._load(connection, row)

    def create(self, batch_id: int, status: str, step: NewApprovalStep) -> Approval:
        with self._pool.connection() as connection:
            row = connection.execute(
                """INSERT INTO approvals (batch_id, status)
                   VALUES (%s, %s)
                   RETURNING id, batch_id, status, created_at, updated_at""",
                (batch_id, status),
            ).fetchone()

            self._insert_step(connection, row[0], step)
            return self._load(connection, row)

    def add_step(self, approval_id: int, status: str, step: NewApprovalStep) -> Approval:
        with self._pool.connection() as connection:
            row = connection.execute(
                """UPDATE approvals
                   SET status = %s, updated_at = now()
                   WHERE id = %s
                   RETURNING id, batch_id, status, created_at, updated_at""",
                (status, approval_id),
            ).fetchone()

            self._insert_step(connection, approval_id, step)
            return self._load(connection, row)

    def _insert_step(self, connection, approval_id: int, step: NewApprovalStep) -> None:
        connection.execute(
            """INSERT INTO approval_steps (approval_id, action, actor, actor_role, comment)
               VALUES (%s, %s, %s, %s, %s)""",
            (approval_id, step.action, step.actor, step.actor_role, step.comment),
        )

    def _load(self, connection, row) -> Approval:
        steps = connection.execute(
            """SELECT action, actor, actor_role, comment, created_at
               FROM approval_steps
               WHERE approval_id = %s
               ORDER BY id""",
            (row[0],),
        ).fetchall()

        return Approval(
            id=row[0],
            batch_id=row[1],
            status=row[2],
            created_at=row[3],
            updated_at=row[4],
            steps=tuple(
                ApprovalStep(action=step[0], actor=step[1], actor_role=step[2], comment=step[3], created_at=step[4])
                for step in steps
            ),
        )
