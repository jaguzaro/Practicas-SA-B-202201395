export type ProtectedRoute = "ruta1" | "ruta2";

export interface AuthorizationDecision {
  allowed: boolean;
  role?: string;
  reason?: string;
}

export interface AuthorizationClient {
  authorize(token: string, route: ProtectedRoute): Promise<AuthorizationDecision>;
}
