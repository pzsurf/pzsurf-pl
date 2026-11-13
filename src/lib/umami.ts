// Umami: counts EVERY visit, consent or not, because it stores nothing on the
// reader's device. Google Analytics (lib/analytics.ts) sees only the readers
// who accept cookies; this is the total it is compared against.
//
// Why it needs no consent, and the settings that keep it that way:
// - No cookies, no localStorage writes. (The script only READS one key,
//   `umami.disabled`, Umami's own opt-out switch.)
// - No IP address is stored: Umami uses it in passing to derive the country
//   and a visitor hash, then drops it.
// - `data-salt-rotation="daily"`: the visitor hash changes every day, so a
//   reader is "one visitor" within a day and cannot be followed across days.
// - `data-exclude-search`: query strings are not sent, so nothing typed into a
//   URL (an e-mail in a link, a search term) reaches Umami.
// - `data-domains`: only the real site counts, never `astro dev`, a preview
//   or a copy of the HTML opened from disk.
// /pliki-cookies/ describes exactly this; change both together.
//
// The website id comes from the build environment (PUBLIC_UMAMI_ID, a UUID
// from Umami → Settings → Websites). Unset means no Umami script at all.

const RAW_ID = import.meta.env.PUBLIC_UMAMI_ID?.trim() || "";
if (RAW_ID && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(RAW_ID)) {
  // Fail the build: a typo would silently count nothing.
  throw new Error(`PUBLIC_UMAMI_ID must be a UUID, got "${RAW_ID}"`);
}
/** The Umami website id, or "" when Umami is not configured. */
export const UMAMI_ID = RAW_ID;

export const UMAMI_SCRIPT = "https://cloud.umami.is/script.js";

/** The hosts whose visits are counted. */
export const UMAMI_DOMAINS = [
  "pzsurf.pl",
  "www.pzsurf.pl",
  "pzsurf-web.web.app",
  "pzsurf-web.firebaseapp.com",
].join(",");
