CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL,
  beneficiary TEXT NOT NULL,
  target_account TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_batch_id_idx ON notifications (batch_id);
