import type { BatchRepository } from "./batch.repository.js";
import type { Batch, BatchDetail, CreateBatchInput } from "./batch.types.js";
import type { TransactionValidator } from "../validation/transaction-validator.js";
import type { AuditClient } from "../audit/audit-client.js";
import { crearSenalesDeNegocio } from "../telemetria/negocio.js";
import { AppError } from "../errors/app-error.js";

interface PostgresUniqueViolation {
  code: string;
}

function isUniqueViolation(error: unknown): error is PostgresUniqueViolation {
  return typeof error === "object" && error !== null && (error as PostgresUniqueViolation).code === "23505";
}

const senales = crearSenalesDeNegocio("transactions-service");

export class BatchService {
  constructor(
    private readonly repository: BatchRepository,
    private readonly validator: TransactionValidator,
    private readonly auditClient: AuditClient,
  ) {}

  async create(input: CreateBatchInput): Promise<Batch> {
    const transactions = input.transactions.map((transaction) => this.validator.validate(transaction));
    const validTransactions = transactions.filter((transaction) => transaction.status === "valid");
    const totalAmount = validTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    try {
      const batch = await this.repository.create({
        reference: input.reference,
        createdBy: input.createdBy,
        status: validTransactions.length > 0 ? "validated" : "rejected",
        totalTransactions: transactions.length,
        validTransactions: validTransactions.length,
        totalAmount,
        transactions,
      });

      await this.auditClient.record({
        correlationId: input.correlationId,
        action: "batch_created",
        actor: input.createdBy,
        batchId: batch.id,
        detail: `${batch.validTransactions} de ${batch.totalTransactions} transacciones validas`,
      });

      senales.lotesCreados.add(1, { estado: batch.status });
      senales.montoProcesado.add(totalAmount, { estado: batch.status });
      for (const rechazada of transactions.filter((transaction) => transaction.status === "invalid")) {
        senales.transaccionesRechazadas.add(1, { motivo: rechazada.reason ?? "desconocido" });
      }

      return batch;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("Ya existe un lote con esa referencia", 409);
      }
      throw error;
    }
  }

  async list(): Promise<Batch[]> {
    return this.repository.findAll();
  }

  async findById(id: number): Promise<BatchDetail> {
    const batch = await this.repository.findById(id);

    if (!batch) {
      throw new AppError("El lote no existe", 404);
    }

    return batch;
  }
}
