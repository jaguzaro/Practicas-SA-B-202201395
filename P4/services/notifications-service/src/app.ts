import express from "express";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { JwtTokenVerifier } from "./auth/jwt-token-verifier.js";
import { HttpAuthorizationClient } from "./authz/http-authorization-client.js";
import { HttpAuditClient } from "./audit/http-audit-client.js";
import { requireAccess } from "./middleware/require-access.js";
import { errorHandler } from "./middleware/error-handler.js";
import { PostgresNotificationRepository } from "./notifications/postgres-notification.repository.js";
import { HttpBatchClient } from "./notifications/http-batch-client.js";
import { NotificationService } from "./notifications/notification.service.js";
import { createNotificationRouter } from "./notifications/notification.controller.js";

export function createApp() {
  const repository = new PostgresNotificationRepository(pool);
  const batchClient = new HttpBatchClient(env.transactionsServiceUrl);
  const auditClient = new HttpAuditClient(env.auditServiceUrl, "notifications-service");
  const service = new NotificationService(repository, batchClient, auditClient);
  const tokenVerifier = new JwtTokenVerifier(env.jwtSecret);
  const authorizationClient = new HttpAuthorizationClient(env.authzServiceUrl, env.authzMaxRetries, env.authzBackoffMs);

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "notifications-service" });
  });

  app.use(createNotificationRouter(service, requireAccess(tokenVerifier, authorizationClient, "notifications")));

  app.use(errorHandler);

  return app;
}
