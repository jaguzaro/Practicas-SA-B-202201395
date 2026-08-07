export type Role = "admin" | "cliente";

export interface PublicUser {
  id: number;
  nombre: string;
  correo: string;
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

export interface ProtectedRouteResult {
  status: number;
  allowed: boolean;
  message: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message = data && typeof data.message === "string" ? data.message : "Error inesperado";
    throw new Error(message);
  }

  return data as T;
}

export function register(input: RegisterInput): Promise<PublicUser> {
  return request<PublicUser>("/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: LoginInput): Promise<PublicUser> {
  return request<PublicUser>("/login", { method: "POST", body: JSON.stringify(input) });
}

export function me(): Promise<{ auth: { sub: string; role: Role } }> {
  return request("/me");
}

export function logout(): Promise<{ message: string }> {
  return request("/logout", { method: "POST" });
}

export async function checkProtectedRoute(route: "ruta1" | "ruta2"): Promise<ProtectedRouteResult> {
  const response = await fetch(`${BASE_URL}/${route}`, { credentials: "include" });
  const data = await response.json().catch(() => ({ message: "Sin respuesta del servidor" }));
  return { status: response.status, allowed: response.status === 200, message: data.message ?? "" };
}
