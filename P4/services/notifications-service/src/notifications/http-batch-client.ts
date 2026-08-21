import type { BatchClient, BatchTransaction } from "./batch-client.js";

const REQUEST_TIMEOUT_MS = 3000;

interface BatchDetailResponse {
  transactions: BatchTransaction[];
}

export class HttpBatchClient implements BatchClient {
  constructor(private readonly baseUrl: string) {}

  async findTransactions(batchId: number, token: string): Promise<BatchTransaction[]> {
    const response = await fetch(`${this.baseUrl}/transactions/batches/${batchId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`transactions-service respondio con estado ${response.status}`);
    }

    const body = (await response.json()) as BatchDetailResponse;
    return body.transactions;
  }
}
