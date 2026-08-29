import type { RoutePolicy } from "./route-policy.js";
import type { ProtectedRoute, Role } from "../domain/types.js";

const ALLOWED_ROLES_BY_ROUTE: Record<ProtectedRoute, Role[]> = {
  transactions: ["admin", "maker", "authorizer", "auditor"],
  approvals: ["admin", "maker", "checker", "authorizer"],
  audit: ["admin", "auditor"],
  notifications: ["admin", "authorizer", "auditor"],
};

export class RoleRoutePolicy implements RoutePolicy {
  isAllowed(role: Role, route: ProtectedRoute): boolean {
    return ALLOWED_ROLES_BY_ROUTE[route].includes(role);
  }
}
