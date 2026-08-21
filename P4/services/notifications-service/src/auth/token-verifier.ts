export type Role = "admin" | "maker" | "checker" | "authorizer" | "auditor";

export interface VerifiedToken {
  subject: string;
  role: Role;
}

export interface TokenVerifier {
  verify(token: string): VerifiedToken;
}
