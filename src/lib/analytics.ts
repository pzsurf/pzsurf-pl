// Google Analytics 4, loaded ONLY after the reader has said yes.
//
// The GA measurement id comes from the build environment (PUBLIC_GA_ID, e.g.
// "G-ABC123XYZ"; see README → Analytics). With no id the site ships no banner,
// no script and no cookies: there is nothing to ask consent for.
//
// How consent works, and why this way:
// - NOTHING is requested from Google before consent: no gtag.js, no cookieless
//   "pings". That is Consent Mode's BASIC implementation. The ADVANCED one
//   loads the tag up front and sends pings without cookies, which several EU
//   regulators consider processing without consent; a public body's site
//   should not be the test case (GDPR art. 6(1)(a), and art. 399 of Prawo
//   komunikacji elektronicznej, the Polish ePrivacy rule for cookies).
// - Consent Mode v2 signals are still sent once the tag loads, because Google
//   requires them for EEA traffic: analytics granted, every advertising
//   signal denied — this site asks for analytics and nothing else.
// - The choice is kept 12 months, then asked again; the _ga cookies are set to
//   expire after 13 months, the ceiling EU regulators accept for audience
//   measurement. Withdrawing deletes them at once.
//
// The banner (ConsentBanner.astro) and the settings on /pliki-cookies/ are the
// two places that call saveConsent(); every page applies the stored choice.

const RAW_ID = import.meta.env.PUBLIC_GA_ID?.trim() || "";
if (RAW_ID && !/^G-[A-Z0-9]+$/.test(RAW_ID)) {
  // Fail the build: a typo here would ship a banner asking consent for an
  // analytics property that does not exist.
  throw new Error(`PUBLIC_GA_ID must look like "G-XXXXXXXXXX", got "${RAW_ID}"`);
}
/** The GA4 measurement id, or "" when analytics is not configured. */
export const GA_ID = RAW_ID;

const STORAGE = "pzsurf-consent";
/** Bump when what is asked changes (a new purpose, a new tool): every reader
 *  is then asked again, since their old answer was to a different question. */
const VERSION = 1;
const VALID_MS = 365 * 24 * 60 * 60 * 1000;
const COOKIE_SECONDS = 395 * 24 * 60 * 60;   // 13 months

export interface Consent { v: number; analytics: boolean; at: string }

/** The reader's current, still-valid decision, or null if they have not made
 *  one (or it expired, or it was for an older version of the question). */
export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as Consent | null;
    if (!c || c.v !== VERSION || typeof c.analytics !== "boolean") return null;
    if (Date.now() - Date.parse(c.at) > VALID_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): void {
  const c: Consent = { v: VERSION, analytics, at: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE, JSON.stringify(c));
  } catch {
    /* blocked storage: the choice applies to this page view only */
  }
  applyConsent(analytics);
}

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; [key: `ga-disable-${string}`]: boolean }
}

let loaded = false;

/** Start or stop analytics to match a decision. Safe to call repeatedly. */
export function applyConsent(analytics: boolean): void {
  if (!GA_ID) return;
  if (analytics) load();
  else if (loaded || document.cookie.includes("_ga")) withdraw();
}

function load(): void {
  window[`ga-disable-${GA_ID}`] = false;
  if (loaded) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag must push the `arguments` object itself, not an array: that is what
  // gtag.js recognises as a command.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  const gtag = window.gtag;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  gtag("consent", "update", { analytics_storage: "granted" });
  gtag("js", new Date());
  gtag("config", GA_ID, {
    cookie_expires: COOKIE_SECONDS,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

function withdraw(): void {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  // Google's documented opt-out switch: the loaded tag stops sending.
  window[`ga-disable-${GA_ID}`] = true;
  // And the cookies go now, not in 13 months. GA sets them on the widest
  // domain it can, so try each level of this host.
  const names = document.cookie.split(";").map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_"));
  const parts = location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join(".")}`);
  for (const n of names) {
    for (const d of domains) document.cookie = `${n}=; max-age=0; path=/${d}`;
  }
}
