import { pool } from "../db/pool.js";
import { secureCipher, lookupCipher } from "../crypto/cipher-factory.js";

async function main() {
  const nombre = "Ada Lovelace";
  const correo = "ada@example.com";
  const password = "ClaveSegura123";
  const rol = "admin";

  const encryptedNombre = secureCipher.encrypt(nombre);
  const encryptedCorreo = lookupCipher.encrypt(correo);
  const encryptedPassword = secureCipher.encrypt(password);

  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO usuarios (nombre, correo, password, rol)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (correo) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id`,
    [encryptedNombre, encryptedCorreo, encryptedPassword, rol],
  );

  const id = inserted.rows[0].id;

  const stored = await pool.query<{ nombre: string; correo: string; password: string }>(
    `SELECT nombre, correo, password FROM usuarios WHERE id = $1`,
    [id],
  );
  const row = stored.rows[0];

  console.log("Fila cruda en la base de datos:");
  console.log(row);

  console.log("\nValores desencriptados:");
  console.log({
    nombre: secureCipher.decrypt(row.nombre),
    correo: lookupCipher.decrypt(row.correo),
    password: secureCipher.decrypt(row.password),
  });

  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
