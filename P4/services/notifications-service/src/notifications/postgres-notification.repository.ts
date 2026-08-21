import type { Pool } from "pg";
import type { NotificationRepository } from "./notification.repository.js";
import type { NewNotification, Notification } from "./notification.types.js";

interface NotificationRow {
  id: number;
  batch_id: number;
  beneficiary: string;
  target_account: string;
  amount: string;
  status: "sent" | "failed";
  created_at: Date;
}

const COLUMNS = "id, batch_id, beneficiary, target_account, amount, status, created_at";

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    batchId: row.batch_id,
    beneficiary: row.beneficiary,
    targetAccount: row.target_account,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly pool: Pool) {}

  async createMany(notifications: NewNotification[]): Promise<Notification[]> {
    const created: Notification[] = [];

    for (const notification of notifications) {
      const result = await this.pool.query<NotificationRow>(
        `INSERT INTO notifications (batch_id, beneficiary, target_account, amount, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${COLUMNS}`,
        [
          notification.batchId,
          notification.beneficiary,
          notification.targetAccount,
          notification.amount,
          notification.status,
        ],
      );
      created.push(toNotification(result.rows[0]));
    }

    return created;
  }

  async findByBatch(batchId: number): Promise<Notification[]> {
    const result = await this.pool.query<NotificationRow>(
      `SELECT ${COLUMNS} FROM notifications WHERE batch_id = $1 ORDER BY id`,
      [batchId],
    );
    return result.rows.map(toNotification);
  }
}
