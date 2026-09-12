/**
 * The surfpoland public read API.
 *
 * Contract: https://api.surfpoland.com/public-v0.md — read it before changing
 * anything here. Two properties of that contract shape this file:
 *
 *   - It is v0 and DELIBERATELY UNSTABLE. Fields may be renamed or removed
 *     while the version still reads v0, and every such change is recorded in
 *     the contract rather than left to be discovered. So `fetchJson` fails
 *     loudly on a bad response instead of returning a half-empty object that
 *     renders as a blank page nobody notices.
 *   - It is the ONLY source of data here. There is no database, no CMS and no
 *     server: `astro build` calls these functions, writes HTML, and that HTML
 *     is the website.
 *
 * The types are hand-written from the contract rather than generated, because
 * this repo stays dependency-light and only consumes a handful of endpoints.
 * If that stops being true, the monorepo generates its types from the live
 * OpenAPI schema (.github/scripts/generate_api_types.sh) and the same trick
 * works here.
 */

export const API_BASE =
  process.env.PZSURF_API_BASE ?? "https://api.surfpoland.com/api/v0/public";

/** The federation's own slug. Permanent: renaming writes an alias and 301s. */
export const ORG_SLUG = "polski-zwiazek-surfingu";

/** Every response is `{ data, error, meta }` — §1 of the contract. */
interface Envelope<T> {
  data: T;
  error: unknown;
  meta?: { total?: number; count?: number; locale?: string };
}

async function fetchJson<T>(path: string): Promise<Envelope<T>> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  // Loud on purpose. A build that quietly emits an empty page is worse than a
  // build that fails: the empty page gets deployed and looks like a design
  // decision. See the same reasoning in the monorepo's e2e stub table.
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${url}`);
  }
  return (await res.json()) as Envelope<T>;
}

/** A person as the public API is willing to describe them. */
export interface TeamMember {
  /** Already abbreviated where the API decided it must be — a minor gets an
   *  abbreviated surname, and unknown date of birth counts as minor. Never
   *  expand or re-join these; the abbreviation IS the privacy control. */
  display_name: string;
  /** Null unless that person consented to publication of their image. The
   *  name publishes under public-task, the photograph only under consent. */
  image_url: string | null;
  role: string;
  /** Age groups (U10…U18), assigned on the roster. No date of birth is ever
   *  exposed, so this is the only age signal and it is deliberately coarse. */
  categories: string[];
}

export interface NationalTeam {
  year: number;
  discipline: string;
  /** "Junior", "Senior", or null when the discipline fields a single squad. */
  name: string | null;
  member_count: number;
  members: TeamMember[];
}

export async function getNationalTeams(): Promise<NationalTeam[]> {
  const { data } = await fetchJson<NationalTeam[]>(
    `/orgs/${ORG_SLUG}/national-teams`,
  );
  return data;
}

export interface OrgAddress {
  address: string;
  is_primary: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface OrgSocial {
  platform: string;
  url: string;
}

export interface Organisation {
  slug: string;
  name: string;
  description: string | null;
  types: string[];
  city: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  image_url: string | null;
  addresses: OrgAddress[];
  socials: OrgSocial[];
  disciplines: string[];
}

export async function getOrganisation(): Promise<Organisation> {
  const { data } = await fetchJson<Organisation>(`/orgs/${ORG_SLUG}`);
  return data;
}

/** Latest season present in the data — never a hardcoded year. */
export const latestYear = (teams: NationalTeam[]): number | null =>
  teams.length ? Math.max(...teams.map((t) => t.year)) : null;

/** Squad label: the discipline, plus the squad name when there is more than
 *  one for that discipline ("Shortboard Junior" / "Shortboard Senior"). */
export function teamTitle(team: NationalTeam): string {
  const discipline = DISCIPLINE_PL[team.discipline] ?? team.discipline;
  return team.name ? `${discipline} ${team.name}` : discipline;
}

/** Polish display names. The API returns the CODE; the page owns the wording,
 *  the same split the contract describes — it serves data, we do presentation. */
const DISCIPLINE_PL: Record<string, string> = {
  SHORTBOARD: "Shortboard",
  LONGBOARD: "Longboard",
  SUP: "SUP",
};

/** The registered seat, or the first address on file. */
export const primaryAddress = (org: Organisation): string | null =>
  (org.addresses.find((a) => a.is_primary) ?? org.addresses[0])?.address ?? null;

/** Socials, de-duplicated by URL and with the platform RE-DERIVED from the host.
 *
 *  The API's `platform` is whatever an admin picked in the console, and today
 *  it is wrong: both of the federation's links are stored as "instagram",
 *  including the Facebook one. The URL cannot lie, so the URL decides — and a
 *  link we cannot place gets a neutral label rather than the wrong icon. */
export function socialLinks(org: Organisation): { label: string; url: string }[] {
  const seen = new Set<string>();
  const out: { label: string; url: string }[] = [];
  for (const s of org.socials) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    const host = (() => { try { return new URL(s.url).hostname; } catch { return ""; } })();
    const label = host.includes("facebook") ? "Facebook"
      : host.includes("instagram") ? "Instagram"
      : host.includes("youtube") ? "YouTube"
      : host.includes("linkedin") ? "LinkedIn"
      : host.replace(/^www\./, "") || s.platform;
    out.push({ label, url: s.url });
  }
  return out;
}
