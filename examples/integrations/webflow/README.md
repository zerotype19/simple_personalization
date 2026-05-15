# Webflow: footer embed + `data-si-surface` visibility

## 1. Site-wide footer embed — load Optiview

Paste into **Site settings → Custom code → Footer code**:

```html
<!-- See footer-embed.html in this folder -->
```

## 2. Section custom attribute

On the block Optiview should reveal:

- **Custom attribute** name: `data-si-surface`
- **Value:** `article_inline_mid` (or your catalog surface_id)

Set the section to **hidden** initially (display none) **or** let the script set `display: none` on first paint.

## Docs

**`docs/integrations/webflow.md`**
