export type Role = "admin" | "maker" | "checker" | "authorizer" | "auditor";

export const ROLES: Role[] = ["admin", "maker", "checker", "authorizer", "auditor"];

export interface UserRecord {
  id: number;
  nombreCifrado: string;
  correoCifrado: string;
  passwordCifrado: string;
  rol: Role;
}

export interface NewUserRecord {
  nombreCifrado: string;
  correoCifrado: string;
  passwordCifrado: string;
  rol: Role;
}

export interface RegisterInput {
  nombre: string;
  correo: string;
  password: string;
  rol: Role;
}

export interface LoginInput {
  correo: string;
  password: string;
}

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
  rol: Role;
}
