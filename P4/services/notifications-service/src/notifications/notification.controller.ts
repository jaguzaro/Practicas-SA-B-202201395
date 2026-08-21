import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import type { NotificationService } from "./notification.service.js";
import type { AuthenticatedRequest } from "../middleware/require-access.js";
import { AppError } from "../errors/app-error.js";

function batchIdFrom(value: string | string[]): number {
  const batchId = Number(Array.isArray(value) ? value[0] : value);

  if (!Number.isInteger(batchId)) {
    throw new AppError("El identificador del lote debe ser numerico", 400);
  }

  return batchId;
}

function tokenFrom(req: AuthenticatedRequest): string {
  const header = req.headers.authorization ?? "";
  return header.slice("Bearer ".length);
}

export function createNotificationRouter(service: NotificationService, requireAccess: RequestHandler): Router {
  const router = Router();

  router.post("/notifications/batches/:batchId", requireAccess, async (req: AuthenticatedRequest, res, next) => {
    try {
      const notifications = await service.notifyBatch(
        batchIdFrom(req.params.batchId),
        tokenFrom(req),
        req.auth?.subject ?? "desconocido",
        req.header("x-correlation-id") ?? randomUUID(),
      );

      res.status(201).json(notifications);
    } catch (error) {
      next(error);
    }
  });

  router.get("/notifications/batches/:batchId", requireAccess, async (req, res, next) => {
    try {
      res.status(200).json(await service.findByBatch(batchIdFrom(req.params.batchId)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
