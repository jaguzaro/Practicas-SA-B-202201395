import type { Role } from "../users/user.types.js";

export interface TokenPayload {
  sub: string;
  role: Role;
}

export interface DecodedToken extends TokenPayload {
  exp: number;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): DecodedToken;
  decodeIgnoringExpiration(token: string): DecodedToken | null;
}
