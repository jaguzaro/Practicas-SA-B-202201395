import { Router } from "express";
import type { TokenService } from "../auth/token.service.js";
import type { AuthorizationClient } from "../authz-client/authorization-client.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireRole } from "../middleware/require-role.js";

export function createProtectedRouter(tokenService: TokenService, authorizationClient: AuthorizationClient): Router {
  const router = Router();

  router.get("/ruta1", requireAuth(tokenService), requireRole(authorizationClient, "ruta1"));
  router.get("/ruta2", requireAuth(tokenService), requireRole(authorizationClient, "ruta2"));

  return router;
}
