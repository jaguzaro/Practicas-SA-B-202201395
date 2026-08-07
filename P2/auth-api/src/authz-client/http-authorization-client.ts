import type { AuthorizationClient, AuthorizationDecision, ProtectedRoute } from "./authorization-client.js";
import { withRetry } from "./retry.js";

const REQUEST_TIMEOUT_MS = 2000;

export class HttpAuthorizationClient implements AuthorizationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly maxRetries: number,
    private readonly backoffMs: number,
  ) {}

  async authorize(token: string, route: ProtectedRoute): Promise<AuthorizationDecision> {
    return withRetry(
      async () => {
        const response = await fetch(`${this.baseUrl}/authorize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, route }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new Error(`authz-service respondió con estado ${response.status}`);
        }

        return (await response.json()) as AuthorizationDecision;
      },
      { maxRetries: this.maxRetries, backoffMs: this.backoffMs },
    );
  }
}
