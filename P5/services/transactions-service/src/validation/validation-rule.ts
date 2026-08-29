import type { TransactionInput } from "../batches/batch.types.js";

export interface ValidationRule {
  readonly reason: string;
  isSatisfiedBy(transaction: TransactionInput): boolean;
}
