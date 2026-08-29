import type { Pool } from "pg";
import type { UserRepository } from "./user.repository.js";
import type { NewUserRecord, Role, UserRecord } from "./user.types.js";

interface UserRow {
  id: number;
  nombre: string;
  correo: string;
  password: string;
  rol: Role;
}

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    nombreCifrado: row.nombre,
    correoCifrado: row.correo,
    passwordCifrado: row.password,
    rol: row.rol,
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEncryptedEmail(correoCifrado: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      "SELECT id, nombre, correo, password, rol FROM usuarios WHERE correo = $1",
      [correoCifrado],
    );
    const row = result.rows[0];
    return row ? toRecord(row) : null;
  }

  async create(user: NewUserRecord): Promise<UserRecord> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO usuarios (nombre, correo, password, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, correo, password, rol`,
      [user.nombreCifrado, user.correoCifrado, user.passwordCifrado, user.rol],
    );
    return toRecord(result.rows[0]);
  }
}
