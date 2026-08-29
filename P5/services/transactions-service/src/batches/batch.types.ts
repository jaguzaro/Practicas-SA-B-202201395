export interface TransactionInput {
  sourceAccount: string;
  targetAccount: string;
  beneficiary: string;
  amount: number;
}

export interface ValidatedTransaction extends TransactionInput {
  status: "valid" | "invalid";
  reason: string | null;
}

export interface NewBatch {
  reference: string;
  createdBy: string;
  status: "validated" | "rejected";
  totalTransactions: number;
  validTransactions: number;
  totalAmount: number;
  transactions: ValidatedTransaction[];
}

export interface Batch {
  id: number;
  reference: string;
  createdBy: string;
  status: "validated" | "rejected";
  totalTransactions: number;
  validTransactions: number;
  totalAmount: number;
  createdAt: string;
}

export interface BatchDetail extends Batch {
  transactions: ValidatedTransaction[];
}

export interface CreateBatchInput {
  reference: string;
  createdBy: string;
  correlationId: string;
  transactions: TransactionInput[];
}
