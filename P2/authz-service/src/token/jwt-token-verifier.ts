import jwt from "jsonwebtoken";
import type { TokenVerifier, VerifiedToken } from "./token-verifier.js";
import type { Role } from "../domain/types.js";

const VALID_ROLES: Role[] = ["admin", "cliente"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (VALID_ROLES as string[]).includes(value);
}

export class JwtTokenVerifier implements TokenVerifier {
  constructor(private readonly secret: string) {}

  verify(token: string): VerifiedToken {
    const payload = jwt.verify(token, this.secret);

    if (typeof payload === "string" || !isRole(payload.role) || typeof payload.sub !== "string") {
      throw new Error("El token no contiene un rol o identificador válido");
    }

    return { subject: payload.sub, role: payload.role };
  }
}
