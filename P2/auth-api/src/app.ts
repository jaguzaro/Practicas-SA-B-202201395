import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { secureCipher, lookupCipher } from "./crypto/cipher-factory.js";
import { PostgresUserRepository } from "./users/postgres-user.repository.js";
import { UserService } from "./users/user.service.js";
import { JwtTokenService } from "./auth/jwt-token.service.js";
import { createUserRouter } from "./users/user.controller.js";
import { createProtectedRouter } from "./routes/protected.controller.js";
import { HttpAuthorizationClient } from "./authz-client/http-authorization-client.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.frontendOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  const userRepository = new PostgresUserRepository(pool);
  const userService = new UserService(userRepository, secureCipher, lookupCipher);
  const tokenService = new JwtTokenService(env.jwtSecret, env.jwtExpiration);
  const authorizationClient = new HttpAuthorizationClient(env.authzServiceUrl, env.authzMaxRetries, env.authzBackoffMs);

  app.use(createUserRouter(userService, tokenService));
  app.use(createProtectedRouter(tokenService, authorizationClient));

  app.use(errorHandler);

  return app;
}
