ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS lease_owner TEXT;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMP;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS result_json JSONB;
ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS error_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS analysis_runs_idempotency_idx ON analysis_runs(project_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS analysis_runs_queue_idx ON analysis_runs(status, lease_expires_at, created_at);
