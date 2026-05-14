-- Tenancy + customer dashboard access (Cloudflare Access maps to authorized_users.email).

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  snippet_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites (domain);

CREATE TABLE IF NOT EXISTS authorized_users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users (email);

-- Ingestion: resolved server-side after site/snippet validation (never trust client tenant_id).
ALTER TABLE sessions_summary ADD COLUMN tenant_id TEXT;
ALTER TABLE sessions_summary ADD COLUMN site_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_summary_site_id ON sessions_summary (site_id);
CREATE INDEX IF NOT EXISTS idx_sessions_summary_tenant_site ON sessions_summary (tenant_id, site_id);
