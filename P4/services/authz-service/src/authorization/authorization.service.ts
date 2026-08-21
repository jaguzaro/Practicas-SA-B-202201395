import type { TokenVerifier } from "../token/token-verifier.js";
import type { RoutePolicy } from "../policy/route-policy.js";
import type { AuthorizationResult, ProtectedRoute } from "../domain/types.js";

export class AuthorizationService {
  constructor(
    private readonly tokenVerifier: TokenVerifier,
    private readonly routePolicy: RoutePolicy,
  ) {}

  authorize(token: string, route: ProtectedRoute): AuthorizationResult {
    let verified;
    try {
      verified = this.tokenVerifier.verify(token);
    } catch {
      return { allowed: false, reason: "token_invalido" };
    }

    const allowed = this.routePolicy.isAllowed(verified.role, route);
    return {
      allowed,
      role: verified.role,
      reason: allowed ? undefined : "rol_no_autorizado",
    };
  }
}
