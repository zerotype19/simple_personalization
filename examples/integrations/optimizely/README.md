# Optimizely: push tag + optional user attributes

1. Load **`Session Intelligence`** and your Optimizely snippet.
2. Paste **`user-attributes.js`** (or merge into Project JS).

**Note:** `optimizely.push({ type: "user", attributes: { ... }})` varies by **Web / Full Stack** and snippet version — validate in Optimizely’s debugger and replace with your supported **Event API** if needed.

See **`docs/integrations/optimizely.md`**.
