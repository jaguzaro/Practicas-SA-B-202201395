import type { NotificationRepository } from "./notification.repository.js";
import type { BatchClient } from "./batch-client.js";
import type { Notification } from "./notification.types.js";
import type { AuditClient } from "../audit/audit-client.js";
import { AppError } from "../errors/app-error.js";

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly batchClient: BatchClient,
    private readonly auditClient: AuditClient,
  ) {}

  async notifyBatch(batchId: number, token: string, actor: string, correlationId: string): Promise<Notification[]> {
    let transactions;

    try {
      transactions = await this.batchClient.findTransactions(batchId, token);
    } catch {
      throw new AppError("No se pudo obtener el lote desde transactions-service", 502);
    }

    const pending = transactions.filter((transaction) => transaction.status === "valid");

    if (pending.length === 0) {
      throw new AppError("El lote no tiene transacciones validas para notificar", 409);
    }

    const created = await this.repository.createMany(
      pending.map((transaction) => ({
        batchId,
        beneficiary: transaction.beneficiary,
        targetAccount: transaction.targetAccount,
        amount: transaction.amount,
        status: "sent" as const,
      })),
    );

    await this.auditClient.record({
      correlationId,
      action: "notifications_sent",
      actor,
      batchId,
      detail: `${created.length} beneficiarios notificados`,
    });

    return created;
  }

  async findByBatch(batchId: number): Promise<Notification[]> {
    return this.repository.findByBatch(batchId);
  }
}
