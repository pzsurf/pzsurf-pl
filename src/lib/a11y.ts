// The reader's accessibility settings: what they are, where they are kept, and
// the one event that tells the page they changed. Shared by the panel that
// sets them (A11yPanel) and the scripts that obey them (the hero video, the
// partners strip). The CSS side is styles/a11y.css; the inline script in
// layouts/Base.astro applies the stored choice before the first paint.

/** Each setting is a data-a11y-<key> attribute on <html>. */
export const A11Y_KEYS = ["text", "contrast", "links", "spacing", "motion", "images", "font"] as const;
export type A11yKey = (typeof A11Y_KEYS)[number];
export type A11ySettings = Partial<Record<A11yKey, string>>;

/** Per-browser memory. localStorage, because these are one reader's comfort
 *  settings on one device, not something to sync or share. */
export const A11Y_STORAGE = "pzsurf-a11y";

/** Dispatched on `document` whenever a setting changes. */
export const A11Y_EVENT = "pzsurf:a11y";

const attr = (key: A11yKey) => `a11y${key[0].toUpperCase()}${key.slice(1)}`;

export function readSettings(): A11ySettings {
  const out: A11ySettings = {};
  for (const k of A11Y_KEYS) {
    const v = document.documentElement.dataset[attr(k)];
    if (v) out[k] = v;
  }
  return out;
}

export function writeSetting(key: A11yKey, value: string | null): void {
  const d = document.documentElement.dataset;
  if (value === null) delete d[attr(key)];
  else d[attr(key)] = value;
  try {
    localStorage.setItem(A11Y_STORAGE, JSON.stringify(readSettings()));
  } catch {
    /* private mode or blocked storage: the setting still applies to this page */
  }
  document.dispatchEvent(new CustomEvent(A11Y_EVENT, { detail: { key, value } }));
}

/** Should anything move? No, if the reader asked the page to stop, or asked
 *  their whole system for less motion. */
export function motionStopped(): boolean {
  return document.documentElement.dataset.a11yMotion === "off"
    || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
