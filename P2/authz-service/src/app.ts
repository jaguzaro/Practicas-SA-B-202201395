import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { JwtTokenVerifier } from "./token/jwt-token-verifier.js";
import { RoleRoutePolicy } from "./policy/role-route-policy.js";
import { AuthorizationService } from "./authorization/authorization.service.js";
import { createAuthorizationRouter } from "./authorization/authorization.controller.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const tokenVerifier = new JwtTokenVerifier(env.jwtSecret);
  const routePolicy = new RoleRoutePolicy();
  const authorizationService = new AuthorizationService(tokenVerifier, routePolicy);

  app.use(createAuthorizationRouter(authorizationService));

  return app;
}
