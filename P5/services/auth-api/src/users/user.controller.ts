import { Router } from "express";
import type { UserService } from "./user.service.js";
import type { TokenService } from "../auth/token.service.js";
import { ROLES, type Role } from "./user.types.js";
import { AppError } from "../errors/app-error.js";
import { crearSenalesDeNegocio } from "../telemetria/negocio.js";

const senales = crearSenalesDeNegocio("auth-api");
import { clearAuthCookie, setAuthCookie } from "../auth/cookie.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/require-auth.js";

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export function createUserRouter(userService: UserService, tokenService: TokenService): Router {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    try {
      const { nombre, correo, password, rol } = req.body ?? {};

      if (typeof nombre !== "string" || typeof correo !== "string" || typeof password !== "string" || !isRole(rol)) {
        throw new AppError("nombre, correo, password y rol son obligatorios", 400);
      }

      const user = await userService.register({ nombre, correo, password, rol });
      senales.usuariosRegistrados.add(1, { rol: user.rol });
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { correo, password } = req.body ?? {};

      if (typeof correo !== "string" || typeof password !== "string") {
        throw new AppError("correo y password son obligatorios", 400);
      }

      const user = await userService.login({ correo, password });
      const token = tokenService.sign({ sub: String(user.id), role: user.rol });
      setAuthCookie(res, token);
      senales.sesionesIniciadas.add(1, { resultado: "exitosa", rol: user.rol });
      res.status(200).json({ ...user, token });
    } catch (error) {
      senales.sesionesIniciadas.add(1, { resultado: "fallida", rol: "desconocido" });
      next(error);
    }
  });

  router.post("/logout", (_req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ message: "Sesión cerrada" });
  });

  router.get("/me", requireAuth(tokenService), (req: AuthenticatedRequest, res) => {
    res.status(200).json({ auth: req.auth });
  });

  return router;
}
