import type { ValidationRule } from "./validation-rule.js";
import type { TransactionInput } from "../batches/batch.types.js";

export class PositiveAmountRule implements ValidationRule {
  readonly reason = "monto_no_positivo";

  isSatisfiedBy(transaction: TransactionInput): boolean {
    return transaction.amount > 0;
  }
}

export class AmountLimitRule implements ValidationRule {
  readonly reason = "monto_excede_limite";

  constructor(private readonly limit: number) {}

  isSatisfiedBy(transaction: TransactionInput): boolean {
    return transaction.amount <= this.limit;
  }
}

export class DistinctAccountsRule implements ValidationRule {
  readonly reason = "cuentas_iguales";

  isSatisfiedBy(transaction: TransactionInput): boolean {
    return transaction.sourceAccount !== transaction.targetAccount;
  }
}

export class AccountFormatRule implements ValidationRule {
  readonly reason = "cuenta_invalida";

  isSatisfiedBy(transaction: TransactionInput): boolean {
    return /^\d{10}$/.test(transaction.sourceAccount) && /^\d{10}$/.test(transaction.targetAccount);
  }
}
