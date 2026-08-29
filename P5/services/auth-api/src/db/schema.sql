CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'maker', 'checker', 'authorizer', 'auditor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
