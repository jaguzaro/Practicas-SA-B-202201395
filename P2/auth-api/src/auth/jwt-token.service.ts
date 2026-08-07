import jwt from "jsonwebtoken";
import type { DecodedToken, TokenPayload, TokenService } from "./token.service.js";
import type { Role } from "../users/user.types.js";
import { TokenExpiredError, TokenInvalidError } from "./token-errors.js";

const VALID_ROLES: Role[] = ["admin", "cliente"];

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (VALID_ROLES as string[]).includes(value);
}

function toDecodedToken(payload: string | jwt.JwtPayload): DecodedToken {
  if (typeof payload === "string" || !isRole(payload.role) || typeof payload.sub !== "string" || typeof payload.exp !== "number") {
    throw new Error("El token no tiene el formato esperado");
  }
  return { sub: payload.sub, role: payload.role, exp: payload.exp };
}

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"] });
  }

  verify(token: string): DecodedToken {
    try {
      const payload = jwt.verify(token, this.secret);
      return toDecodedToken(payload);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw new TokenInvalidError();
    }
  }

  decodeIgnoringExpiration(token: string): DecodedToken | null {
    try {
      const payload = jwt.verify(token, this.secret, { ignoreExpiration: true });
      return toDecodedToken(payload);
    } catch {
      return null;
    }
  }
}
