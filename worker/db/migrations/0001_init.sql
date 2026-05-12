CREATE TABLE IF NOT EXISTS sessions_summary (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  origin TEXT,
  ingest_reason TEXT,
  summary_json TEXT,
  intent_score INTEGER,
  urgency_score INTEGER,
  engagement_score INTEGER,
  journey_stage TEXT,
  treatment_id TEXT,
  converted INTEGER,
  conversion_type TEXT,
  experiment_json TEXT,
  treatments_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_summary_session_id ON sessions_summary (session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_summary_created_at ON sessions_summary (created_at);

CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatments (
  id TEXT PRIMARY KEY,
  experiment_id TEXT,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL
);
