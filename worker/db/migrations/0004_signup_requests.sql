-- Free access / marketing signup requests (manual onboarding; no auto-provision).

CREATE TABLE IF NOT EXISTS signup_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  website TEXT NOT NULL,
  use_case TEXT NOT NULL,
  tools_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_signup_requests_created_at ON signup_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON signup_requests (email);
