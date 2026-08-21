import { timingSafeEqual } from "node:crypto";
import type { Cipher } from "../crypto/cipher.js";
import type { UserRepository } from "./user.repository.js";
import type { LoginInput, PublicUser, RegisterInput } from "./user.types.js";
import { AppError } from "../errors/app-error.js";

interface PostgresUniqueViolation {
  code: string;
}

function isUniqueViolation(error: unknown): error is PostgresUniqueViolation {
  return typeof error === "object" && error !== null && (error as PostgresUniqueViolation).code === "23505";
}

function passwordsMatch(stored: string, provided: string): boolean {
  const storedBuffer = Buffer.from(stored, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (storedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return timingSafeEqual(storedBuffer, providedBuffer);
}

export class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly secureCipher: Cipher,
    private readonly lookupCipher: Cipher,
  ) {}

  async register(input: RegisterInput): Promise<PublicUser> {
    try {
      const created = await this.repository.create({
        nombreCifrado: this.secureCipher.encrypt(input.nombre),
        correoCifrado: this.lookupCipher.encrypt(input.correo),
        passwordCifrado: this.secureCipher.encrypt(input.password),
        rol: input.rol,
      });

      return {
        id: created.id,
        nombre: input.nombre,
        correo: input.correo,
        rol: created.rol,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("Ya existe un usuario registrado con ese correo", 409);
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<PublicUser> {
    const correoCifrado = this.lookupCipher.encrypt(input.correo);
    const user = await this.repository.findByEncryptedEmail(correoCifrado);

    if (!user) {
      throw new AppError("Correo o contraseña incorrectos", 401);
    }

    const storedPassword = this.secureCipher.decrypt(user.passwordCifrado);
    if (!passwordsMatch(storedPassword, input.password)) {
      throw new AppError("Correo o contraseña incorrectos", 401);
    }

    return {
      id: user.id,
      nombre: this.secureCipher.decrypt(user.nombreCifrado),
      correo: input.correo,
      rol: user.rol,
    };
  }
}
