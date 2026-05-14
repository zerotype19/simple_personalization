-- Dev/demo seed (INSERT OR IGNORE). Replace emails in production via D1 console or admin tooling.

INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES
  ('tn_demo', 'Demo tenant', datetime('now'));

INSERT OR IGNORE INTO sites (id, tenant_id, domain, snippet_key, display_name, created_at) VALUES
  ('st_demo_velocity', 'tn_demo', 'optiview.ai', 'sk_demo_velocity', 'Velocity (optiview.ai)', datetime('now')),
  ('st_demo_local', 'tn_demo', 'localhost', 'sk_demo_local', 'Local dev (localhost)', datetime('now'));

INSERT OR IGNORE INTO authorized_users (id, tenant_id, email, role, created_at) VALUES
  ('au_platform', 'tn_demo', 'admin@optiview.local', 'platform_admin', datetime('now')),
  ('au_viewer', 'tn_demo', 'viewer@optiview.local', 'customer_viewer', datetime('now'));
