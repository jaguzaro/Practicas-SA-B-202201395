import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";
import { secureCipher, lookupCipher } from "../crypto/cipher-factory.js";
import { ROLES } from "../users/user.types.js";

const DEFAULT_PASSWORD = "Practica4";

async function applySchema(): Promise<void> {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
}

async function seedUsers(): Promise<void> {
  for (const rol of ROLES) {
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, password, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (correo) DO NOTHING`,
      [
        secureCipher.encrypt(`Usuario ${rol}`),
        lookupCipher.encrypt(`${rol}@sa.gt`),
        secureCipher.encrypt(DEFAULT_PASSWORD),
        rol,
      ],
    );
  }
}

export async function bootstrapDatabase(): Promise<void> {
  await applySchema();
  await seedUsers();
}
