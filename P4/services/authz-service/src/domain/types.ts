export type Role = "admin" | "maker" | "checker" | "authorizer" | "auditor";

export const ROLES: Role[] = ["admin", "maker", "checker", "authorizer", "auditor"];

export type ProtectedRoute = "transactions" | "approvals" | "audit" | "notifications";

export const PROTECTED_ROUTES: ProtectedRoute[] = ["transactions", "approvals", "audit", "notifications"];

export interface AuthorizationResult {
  allowed: boolean;
  role?: Role;
  reason?: string;
}
