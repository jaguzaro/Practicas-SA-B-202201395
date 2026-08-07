export type Role = "admin" | "cliente";

export type ProtectedRoute = "ruta1" | "ruta2";

export interface AuthorizationResult {
  allowed: boolean;
  role?: Role;
  reason?: string;
}
