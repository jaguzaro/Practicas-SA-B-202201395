import type { ProtectedRoute, Role } from "../domain/types.js";

export interface RoutePolicy {
  isAllowed(role: Role, route: ProtectedRoute): boolean;
}
