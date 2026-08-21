import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4003),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  authzServiceUrl: required("AUTHZ_SERVICE_URL"),
  authzMaxRetries: Number(process.env.AUTHZ_MAX_RETRIES ?? 3),
  authzBackoffMs: Number(process.env.AUTHZ_BACKOFF_MS ?? 300),
  auditServiceUrl: required("AUDIT_SERVICE_URL"),
  transactionsServiceUrl: required("TRANSACTIONS_SERVICE_URL"),
};
