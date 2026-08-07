import type { NextFunction, Request, Response } from "express";
import ms from "ms";
import type { TokenService } from "../auth/token.service.js";
import type { Role } from "../users/user.types.js";
import { AUTH_COOKIE_NAME, setAuthCookie } from "../auth/cookie.js";
import { TokenExpiredError } from "../auth/token-errors.js";
import { env } from "../config/env.js";

export interface AuthenticatedRequest extends Request {
  auth?: { sub: string; role: Role };
  authToken?: string;
}

function withinGracePeriod(expiredAtSeconds: number): boolean {
  const graceMs = ms(env.jwtGracePeriod as ms.StringValue);
  const elapsedMs = Date.now() - expiredAtSeconds * 1000;
  return elapsedMs >= 0 && elapsedMs <= graceMs;
}

export function requireAuth(tokenService: TokenService) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== "string") {
      res.status(401).json({ message: "No hay sesión activa" });
      return;
    }

    try {
      const decoded = tokenService.verify(token);
      req.auth = { sub: decoded.sub, role: decoded.role };
      req.authToken = token;
      next();
      return;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        const expired = tokenService.decodeIgnoringExpiration(token);
        if (expired && withinGracePeriod(expired.exp)) {
          const renewedToken = tokenService.sign({ sub: expired.sub, role: expired.role });
          setAuthCookie(res, renewedToken);
          req.auth = { sub: expired.sub, role: expired.role };
          req.authToken = renewedToken;
          next();
          return;
        }
      }
      res.status(401).json({ message: "Sesión inválida o expirada" });
    }
  };
}
