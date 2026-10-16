import type { Pool } from "pg";
import type { BatchRepository } from "./batch.repository.js";
import type { Batch, BatchDetail, NewBatch, ValidatedTransaction } from "./batch.types.js";

interface BatchRow {
  id: number;
  reference: string;
  created_by: string;
  status: "validated" | "rejected";
  total_transactions: number;
  valid_transactions: number;
  total_amount: string;
  created_at: Date;
}

interface TransactionRow {
  source_account: string;
  target_account: string;
  beneficiary: string;
  amount: string;
  status: "valid" | "invalid";
  reason: string | null;
}

function toBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    reference: row.reference,
    createdBy: row.created_by,
    status: row.status,
    totalTransactions: row.total_transactions,
    validTransactions: row.valid_transactions,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at.toISOString(),
  };
}

function toTransaction(row: TransactionRow): ValidatedTransaction {
  return {
    sourceAccount: row.source_account,
    targetAccount: row.target_account,
    beneficiary: row.beneficiary,
    amount: Number(row.amount),
    status: row.status,
    reason: row.reason,
  };
}

export class PostgresBatchRepository implements BatchRepository {
  constructor(private readonly pool: Pool) {}

  async create(batch: NewBatch): Promise<Batch> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const inserted = await client.query<BatchRow>(
        `INSERT INTO batches (reference, created_by, status, total_transactions, valid_transactions, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, reference, created_by, status, total_transactions, valid_transactions, total_amount, created_at`,
        [
          batch.reference,
          batch.createdBy,
          batch.status,
          batch.totalTransactions,
          batch.validTransactions,
          batch.totalAmount,
        ],
      );

      const created = inserted.rows[0];

      for (const transaction of batch.transactions) {
        await client.query(
          `INSERT INTO batch_transactions (batch_id, source_account, target_account, beneficiary, amount, status, reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            created.id,
            transaction.sourceAccount,
            transaction.targetAccount,
            transaction.beneficiary,
            transaction.amount,
            transaction.status,
            transaction.reason,
          ],
        );
      }

      await client.query("COMMIT");
      return toBatch(created);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(): Promise<Batch[]> {
    const result = await this.pool.query<BatchRow>(
      `SELECT id, reference, created_by, status, total_transactions, valid_transactions, total_amount, created_at
       FROM batches
       ORDER BY id DESC`,
    );

    return result.rows.map(toBatch);
  }

  async findById(id: number): Promise<BatchDetail | null> {
    const batchResult = await this.pool.query<BatchRow>(
      `SELECT id, reference, created_by, status, total_transactions, valid_transactions, total_amount, created_at
       FROM batches
       WHERE id = $1`,
      [id],
    );

    const row = batchResult.rows[0];
    if (!row) {
      return null;
    }

    const transactionsResult = await this.pool.query<TransactionRow>(
      `SELECT source_account, target_account, beneficiary, amount, status, reason
       FROM batch_transactions
       WHERE batch_id = $1
       ORDER BY id`,
      [id],
    );

    return { ...toBatch(row), transactions: transactionsResult.rows.map(toTransaction) };
  }
}
