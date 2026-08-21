import jwt from "jsonwebtoken";
import type { Role, TokenVerifier, VerifiedToken } from "./token-verifier.js";

const ROLES: Role[] = ["admin", "maker", "checker", "authorizer", "auditor"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
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
