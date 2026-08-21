CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'pending_authorization', 'authorized', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id SERIAL PRIMARY KEY,
  approval_id INTEGER NOT NULL REFERENCES approvals (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submit', 'review', 'authorize', 'reject')),
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_steps_approval_id_idx ON approval_steps (approval_id);
