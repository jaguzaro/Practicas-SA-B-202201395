import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { bootstrapDatabase } from "./db/bootstrap.js";

async function main(): Promise<void> {
  await bootstrapDatabase();

  createApp().listen(env.port, () => {
    console.log(`transactions-service escuchando en el puerto ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
