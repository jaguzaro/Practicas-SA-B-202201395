import type { ValidationRule } from "./validation-rule.js";
import type { TransactionInput, ValidatedTransaction } from "../batches/batch.types.js";

export class TransactionValidator {
  constructor(private readonly rules: ValidationRule[]) {}

  validate(transaction: TransactionInput): ValidatedTransaction {
    const failed = this.rules.find((rule) => !rule.isSatisfiedBy(transaction));

    return failed
      ? { ...transaction, status: "invalid", reason: failed.reason }
      : { ...transaction, status: "valid", reason: null };
  }
}
