import { Router } from "express";
import type { AuthorizationService } from "./authorization.service.js";
import type { ProtectedRoute } from "../domain/types.js";

const VALID_ROUTES: ProtectedRoute[] = ["ruta1", "ruta2"];

function isProtectedRoute(value: unknown): value is ProtectedRoute {
  return typeof value === "string" && (VALID_ROUTES as string[]).includes(value);
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
