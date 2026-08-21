import { Router } from "express";
import type { AuthorizationService } from "./authorization.service.js";
import { PROTECTED_ROUTES, type ProtectedRoute } from "../domain/types.js";

function isProtectedRoute(value: unknown): value is ProtectedRoute {
  return typeof value === "string" && (PROTECTED_ROUTES as string[]).includes(value);
}

export function createAuthorizationRouter(service: AuthorizationService): Router {
  const router = Router();

  router.post("/authorize", (req, res) => {
    const { token, route } = req.body ?? {};

    if (typeof token !== "string" || !isProtectedRoute(route)) {
      res.status(400).json({ allowed: false, reason: "solicitud_invalida" });
      return;
    }

    const result = service.authorize(token, route);
    res.status(200).json(result);
  });

  return router;
}
