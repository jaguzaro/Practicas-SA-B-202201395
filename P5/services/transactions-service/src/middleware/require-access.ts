import type { NextFunction, Request, Response } from "express";
import type { TokenVerifier } from "../auth/token-verifier.js";
import type { AuthorizationClient } from "../authz/authorization-client.js";
import type { Role } from "../auth/token-verifier.js";

export interface AuthenticatedRequest extends Request {
  auth?: { subject: string; role: Role };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

export function requireAccess(tokenVerifier: TokenVerifier, client: AuthorizationClient, route: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extractToken(req);

    if (token === null) {
      res.status(401).json({ message: "No hay sesión activa" });
      return;
    }

    let verified;
    try {
      verified = tokenVerifier.verify(token);
    } catch {
      res.status(401).json({ message: "Sesión inválida o expirada" });
      return;
    }

    try {
      const decision = await client.authorize(token, route);
      if (!decision.allowed) {
        res.status(403).json({ message: "Acceso denegado", reason: decision.reason });
        return;
      }
    } catch {
      res.status(503).json({ message: "No se pudo validar la autorización, intente más tarde" });
      return;
    }

    req.auth = { subject: verified.subject, role: verified.role };
    next();
  };
}
