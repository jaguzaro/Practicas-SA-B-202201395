CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('validated', 'rejected')),
  total_transactions INTEGER NOT NULL,
  valid_transactions INTEGER NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batch_transactions (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches (id) ON DELETE CASCADE,
  source_account TEXT NOT NULL,
  target_account TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid')),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS batch_transactions_batch_id_idx ON batch_transactions (batch_id);
