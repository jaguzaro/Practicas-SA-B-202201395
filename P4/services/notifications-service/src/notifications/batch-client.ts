export interface BatchTransaction {
  beneficiary: string;
  targetAccount: string;
  amount: number;
  status: "valid" | "invalid";
}

export interface BatchClient {
  findTransactions(batchId: number, token: string): Promise<BatchTransaction[]>;
}
