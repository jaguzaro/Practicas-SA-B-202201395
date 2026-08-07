import type { Response } from "express";
import type { AuthorizationClient, ProtectedRoute } from "../authz-client/authorization-client.js";
import type { AuthenticatedRequest } from "./require-auth.js";

export function requireRole(client: AuthorizationClient, route: ProtectedRoute) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (typeof req.authToken !== "string") {
      res.status(401).json({ message: "No hay sesión activa" });
      return;
    }

    try {
      const decision = await client.authorize(req.authToken, route);
      if (!decision.allowed) {
        res.status(403).json({ message: "Acceso denegado", reason: decision.reason });
        return;
      }
      res.status(200).json({ message: "Acceso permitido", role: decision.role, route });
    } catch {
      res.status(503).json({ message: "No se pudo validar la autorización, intente más tarde" });
    }
  };
}
