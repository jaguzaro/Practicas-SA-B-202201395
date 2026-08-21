import { randomUUID } from "node:crypto";
import { Router, type RequestHandler } from "express";
import type { BatchService } from "./batch.service.js";
import type { TransactionInput } from "./batch.types.js";
import type { AuthenticatedRequest } from "../middleware/require-access.js";
import { AppError } from "../errors/app-error.js";

function isTransactionInput(value: unknown): value is TransactionInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sourceAccount === "string" &&
    typeof candidate.targetAccount === "string" &&
    typeof candidate.beneficiary === "string" &&
    typeof candidate.amount === "number"
  );
}

export function createBatchRouter(service: BatchService, requireAccess: RequestHandler): Router {
  const router = Router();

  router.post("/transactions/batches", requireAccess, async (req: AuthenticatedRequest, res, next) => {
    try {
      const { reference, transactions } = req.body ?? {};

      if (typeof reference !== "string" || !Array.isArray(transactions) || transactions.length === 0) {
        throw new AppError("reference y transactions son obligatorios", 400);
      }

      if (!transactions.every(isTransactionInput)) {
        throw new AppError("Cada transaccion requiere sourceAccount, targetAccount, beneficiary y amount", 400);
      }

      const batch = await service.create({
        reference,
        createdBy: req.auth?.subject ?? "desconocido",
        correlationId: req.header("x-correlation-id") ?? randomUUID(),
        transactions,
      });

      res.status(201).json(batch);
    } catch (error) {
      next(error);
    }
  });

  router.get("/transactions/batches", requireAccess, async (_req, res, next) => {
    try {
      res.status(200).json(await service.list());
    } catch (error) {
      next(error);
    }
  });

  router.get("/transactions/batches/:id", requireAccess, async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        throw new AppError("El identificador del lote debe ser numerico", 400);
      }

      res.status(200).json(await service.findById(id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
