import type { Role } from "../domain/types.js";

export interface VerifiedToken {
  subject: string;
  role: Role;
}

export interface TokenVerifier {
  verify(token: string): VerifiedToken;
}
