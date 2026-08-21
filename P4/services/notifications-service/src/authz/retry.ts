export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxRetries) {
        await sleep(options.backoffMs * 2 ** attempt);
      }
    }
  }

  throw lastError;
}
