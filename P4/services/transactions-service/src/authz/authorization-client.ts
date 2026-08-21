export interface AuthorizationDecision {
  allowed: boolean;
  role?: string;
  reason?: string;
}

export interface AuthorizationClient {
  authorize(token: string, route: string): Promise<AuthorizationDecision>;
}
