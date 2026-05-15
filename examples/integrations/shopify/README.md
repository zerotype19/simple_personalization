# Shopify: theme snippet for shipping reassurance / comparison modules

## Files

- **`si-experience-decision.liquid`** — include in `theme.liquid` before `</body>` (or inside a section).
- **`si-optiview-surfaces.js`** — add under **`assets/`** and reference with `{{ 'si-optiview-surfaces.js' | asset_url | script_tag }}` **after** Optiview loads.

Replace **`YOUR_SITE_SLUG`** / **`YOUR_PUBLISHABLE_KEY`** and **`surface_id` values** with those from your vertical pack.

See **`docs/integrations/shopify.md`**.
