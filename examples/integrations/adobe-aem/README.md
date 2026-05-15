# AEM: listen for `si:experience-decision` and map `data-si-surface`

1. Host **`Session Intelligence`** on your page (see install docs).
2. Add **`si-surface-listener.js`** as a **clientlib** or inline after Optiview boots.
3. Wrap regions with **`data-si-surface="<surface_id>"`** matching your [surface catalog](../../../docs/SURFACE_CATALOGS.md).

See **`docs/integrations/adobe-aem.md`**.
