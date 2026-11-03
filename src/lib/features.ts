// Feature toggles, read in ONE place. Components and pages import from here;
// astro.config.mjs reads the same rule through `isOn`, because the config runs
// before Astro has loaded the environment for the pages.
//
// PUBLIC_MEMBER_AREA: the member area (sign-in, membership purchase, account
// pages, all backed by Shoreside's /api/v0/member). Anything other than the
// exact string "true" is OFF, and an OFF build must contain nothing of the
// feature: no /konto/ or /dolacz/ pages, no link to them, no Firebase SDK and
// no member API address. .github/scripts/check-member-area.sh enforces that on
// every CI build and every release. See README → Member area.

/** The one rule for every toggle: on only for the exact value "true". */
export function isOn(raw: string | undefined | null): boolean {
  return raw === "true";
}

/** The member area. Off by default; switched on by the repository variable. */
export const MEMBER_AREA: boolean = isOn(import.meta.env?.PUBLIC_MEMBER_AREA);
