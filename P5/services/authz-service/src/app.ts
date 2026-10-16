import express from "express";
import { instrumentarHttp } from "./telemetria/http.js";
import { crearRegistrador } from "./telemetria/registro.js";
import cors from "cors";
import { env } from "./config/env.js";
import { JwtTokenVerifier } from "./token/jwt-token-verifier.js";
import { RoleRoutePolicy } from "./policy/role-route-policy.js";
import { AuthorizationService } from "./authorization/authorization.service.js";
import { createAuthorizationRouter } from "./authorization/authorization.controller.js";

const registrador = crearRegistrador("authz-service");

export function createApp() {
  const app = express();
  app.use(instrumentarHttp("authz-service", registrador));
  app.use(cors());
  app.use(express.json());

  const tokenVerifier = new JwtTokenVerifier(env.jwtSecret);
  const routePolicy = new RoleRoutePolicy();
  const authorizationService = new AuthorizationService(tokenVerifier, routePolicy);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "authz-service" });
  });

  app.use(createAuthorizationRouter(authorizationService));

  return app;
}
