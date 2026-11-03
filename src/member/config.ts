// Where the member area signs in and which API it calls. Imported ONLY by
// pages under src/member/pages/, so none of it reaches an OFF build
// (.github/scripts/check-member-area.sh greps for both addresses).
//
// The Firebase values are the platform's PUBLIC web config, the same that
// shoresidehub.com ships in its own bundle: they identify the project, they
// grant nothing. Each can be overridden at build time, which is how a local
// build points at a local Shoreside.
const env = import.meta.env;

export const MEMBER_API: string =
  env.PUBLIC_MEMBER_API_BASE?.trim() || "https://api.pzsurf.pl/api/v0/member";

export const FIREBASE_CONFIG = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY?.trim() || "AIzaSyCF_JCF1_1rO9U_f0VVjChss-_jhCf5VVI",
  authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "shoreside-platform.firebaseapp.com",
  projectId: env.PUBLIC_FIREBASE_PROJECT_ID?.trim() || "shoreside-platform",
  appId: env.PUBLIC_FIREBASE_APP_ID?.trim() || "1:1053650959179:web:4e5d09f11e955bad0806ce",
};

/** The custom header every state-changing member call carries (Shoreside's
 *  docs/api/member-v0.md §1). A cross-site form cannot send it, and a
 *  cross-origin script needs a CORS preflight to. */
export const CSRF_HEADER = { "x-shoreside-member": "1" };
