/**
 * HTML escaping shared by the standalone scripts that emit static pages, so each
 * one does not grow its own copy. Two had already diverged: one escaped single
 * quotes and the other did not, which is the kind of drift that only matters on
 * the day a value lands inside a single-quoted attribute.
 *
 * Escapes all five characters, which is safe for both text content and quoted
 * attribute values.
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
