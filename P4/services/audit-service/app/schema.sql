CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  batch_id INTEGER,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_correlation_id_idx ON audit_events (correlation_id);
CREATE INDEX IF NOT EXISTS audit_events_batch_id_idx ON audit_events (batch_id);
