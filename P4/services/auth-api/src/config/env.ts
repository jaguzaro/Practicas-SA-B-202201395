import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiration: process.env.JWT_EXPIRATION ?? "15m",
  jwtGracePeriod: process.env.JWT_GRACE_PERIOD ?? "5m",
  aesSecretKey: required("AES_SECRET_KEY"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
};
