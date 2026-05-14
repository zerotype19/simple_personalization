-- Public snippet for https://optiview.ai (and www) marketing site — live Session Intelligence demo for visitors.

INSERT OR IGNORE INTO tenants (id, name, created_at) VALUES
  ('tn_optiview_marketing', 'Optiview (marketing)', datetime('now'));

INSERT OR IGNORE INTO sites (id, tenant_id, domain, snippet_key, display_name, created_at) VALUES
  (
    'st_optiview_marketing',
    'tn_optiview_marketing',
    'optiview.ai',
    'sk_live_optiview_marketing_7Hx2kLm9NqP4',
    'Optiview marketing (optiview.ai)',
    datetime('now')
  );
