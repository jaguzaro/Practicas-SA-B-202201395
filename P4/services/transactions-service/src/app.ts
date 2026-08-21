import express from "express";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { JwtTokenVerifier } from "./auth/jwt-token-verifier.js";
import { HttpAuthorizationClient } from "./authz/http-authorization-client.js";
import { requireAccess } from "./middleware/require-access.js";
import { errorHandler } from "./middleware/error-handler.js";
import { PostgresBatchRepository } from "./batches/postgres-batch.repository.js";
import { BatchService } from "./batches/batch.service.js";
import { createBatchRouter } from "./batches/batch.controller.js";
import { TransactionValidator } from "./validation/transaction-validator.js";
import { HttpAuditClient } from "./audit/http-audit-client.js";
import { AccountFormatRule, AmountLimitRule, DistinctAccountsRule, PositiveAmountRule } from "./validation/rules.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  const validator = new TransactionValidator([
    new AccountFormatRule(),
    new DistinctAccountsRule(),
    new PositiveAmountRule(),
    new AmountLimitRule(env.maxTransactionAmount),
  ]);

  const repository = new PostgresBatchRepository(pool);
  const auditClient = new HttpAuditClient(env.auditServiceUrl, "transactions-service");
  const service = new BatchService(repository, validator, auditClient);
  const tokenVerifier = new JwtTokenVerifier(env.jwtSecret);
  const authorizationClient = new HttpAuthorizationClient(env.authzServiceUrl, env.authzMaxRetries, env.authzBackoffMs);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "transactions-service" });
  });

  app.use(createBatchRouter(service, requireAccess(tokenVerifier, authorizationClient, "transactions")));

  app.use(errorHandler);

  return app;
}
