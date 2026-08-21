import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

export async function bootstrapDatabase(): Promise<void> {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
}
