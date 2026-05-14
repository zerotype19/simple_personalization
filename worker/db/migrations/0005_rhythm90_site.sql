-- Rhythm90.io — customer site + public snippet key for data-si-key on the live host.
-- Apply to production D1 after review: `wrangler d1 migrations apply …` (see worker/wrangler.toml).

INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES
  ('tn_rhythm90', 'Rhythm90', datetime('now'));

INSERT OR IGNORE INTO sites (id, tenant_id, domain, snippet_key, display_name, created_at) VALUES
  (
    'st_rhythm90_io',
    'tn_rhythm90',
    'rhythm90.io',
    'sk_live_rhythm90io_4Vp9cNm2QxK1',
    'Rhythm90 (rhythm90.io)',
    datetime('now')
  );
