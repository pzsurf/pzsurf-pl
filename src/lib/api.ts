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
export interface PersonSocial {
  platform: string;
  url: string;
}

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
  /** Accounts the person published themselves. Empty for a minor and for
   *  anybody who withdrew publication consent — the API decides, not the page. */
  socials: PersonSocial[];
}

export interface NationalTeam {
  year: number;
  discipline: string;
  /** "Junior", "Senior", or null when the discipline fields a single squad. */
  name: string | null;
  member_count: number;
  members: TeamMember[];
}

/**
 * The page builds against the LIVE API, which can lag this repo — a field added
 * to the contract is not in production until that deploy lands. `socials` is
 * exactly that case, so it is defaulted here, once, rather than every component
 * having to wonder.
 *
 * This is not the same as swallowing an error. `fetchJson` still fails the build
 * on a bad response; this only says that an ADDITIVE field which has not shipped
 * yet reads as empty rather than as a crash. The contract is v0 and explicitly
 * unstable, so a consumer that cannot survive a field arriving later is a
 * consumer that breaks on every release.
 */
const withSocials = (m: TeamMember): TeamMember => ({ ...m, socials: m.socials ?? [] });

export async function getNationalTeams(): Promise<NationalTeam[]> {
  const { data } = await fetchJson<NationalTeam[]>(
    `/orgs/${ORG_SLUG}/national-teams`,
  );
  return data.map((t) => ({ ...t, members: t.members.map(withSocials) }));
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

/** The organisation's MAIN bank account — the only one the API publishes. */
export interface OrgBankAccount {
  /** Canonical, no spaces. */
  iban: string;
  /** Grouped for reading: PL25 1090 1694 0000 0001 4658 2135. */
  iban_formatted: string;
  /** Derived from the number; null when the platform does not know the bank. */
  bank_name: string | null;
  currency: string;
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
  // Optional, not just nullable: an API older than these fields omits them,
  // and the footer must then render as it did rather than break the build.
  krs?: string | null;
  nip?: string | null;
  regon?: string | null;
  bank_account?: OrgBankAccount | null;
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

/** One squad a person belongs to, as the dialog lists them. */
export interface Assignment {
  year: number;
  team: string;
  categories: string;
}

/**
 * Every squad each person appears in, keyed by DISPLAY NAME.
 *
 * By name because there is nothing else to key on: the public API exposes no
 * stable per-person id, deliberately — an id across responses would be the join
 * key that turns two endpoints into a profile (contract §4.5). So two athletes
 * who genuinely share a name would be merged here into one dialog. That is the
 * accepted cost of the contract's privacy design, and the alternative is worse:
 * a person's id IS recoverable from their photo URL, which the contract records
 * as a known limitation, and building on a documented leak to work around a
 * deliberate omission would be the wrong trade.
 *
 * Every season is included, not only the latest, so a second year appears here
 * the day the API returns one without any change to this page.
 */
export function assignmentsByPerson(
  teams: NationalTeam[],
): Map<string, Assignment[]> {
  const out = new Map<string, Assignment[]>();
  for (const team of teams) {
    for (const m of team.members) {
      const list = out.get(m.display_name) ?? [];
      list.push({
        year: team.year,
        team: teamTitle(team),
        categories: m.categories.join(" · "),
      });
      out.set(m.display_name, list);
    }
  }
  // Newest season first, then alphabetically — so a dialog reads the same way
  // whichever card opened it.
  for (const list of out.values()) {
    list.sort((a, b) => b.year - a.year || a.team.localeCompare(b.team, "pl"));
  }
  return out;
}

// ── Governance bodies ───────────────────────────────────────────────────────

export interface GovernanceBody {
  name: string;
  body_type: string;
  description: string | null;
  /** The body's OWN crest. Optional twice over: a body need not have one, and
   *  the field itself is absent until the API change that adds it is deployed
   *  (this page builds against the live API, which lags the repo). */
  image_url?: string | null;
  member_count: number;
  members: TeamMember[];
}

export async function getBodies(): Promise<GovernanceBody[]> {
  const { data } = await fetchJson<GovernanceBody[]>(`/orgs/${ORG_SLUG}/bodies`);
  return data.map((b) => ({ ...b, members: b.members.map(withSocials) }));
}

/**
 * Bodies first, committees after, each group alphabetical.
 *
 * The federation's board is the one body a visitor is looking for, so it leads
 * whatever its name sorts to; the rest are komisje and their order is arbitrary,
 * which is exactly when alphabetical is the honest choice.
 */
export const orderBodies = (bodies: GovernanceBody[]): GovernanceBody[] =>
  [...bodies].sort((a, b) =>
    (a.body_type === "BOARD" ? 0 : 1) - (b.body_type === "BOARD" ? 0 : 1) ||
    a.name.localeCompare(b.name, "pl"));

/** Polish for the body kinds the API returns as codes. */
const BODY_TYPE_PL: Record<string, string> = {
  BOARD: "Zarząd",
  COMMITTEE: "Komisja",
  COMMISSION: "Komisja",
};
export const bodyTypeLabel = (t: string): string => BODY_TYPE_PL[t] ?? t;

/** Polish for the governance roles the API returns as codes. */
const ROLE_PL: Record<string, string> = {
  PRESIDENT: "Prezes",
  CHAIR: "Przewodniczący",
  VICE_CHAIR: "Wiceprzewodniczący",
  MEMBER: "Członek",
  ATHLETE: "Zawodnik",
};
export const roleLabel = (role: string): string => ROLE_PL[role] ?? role;

/**
 * Which bodies each person sits on, keyed by display name.
 *
 * Deliberately NOT joined with `assignmentsByPerson`, even though a person can
 * be both an athlete and a committee member. The two endpoints format the same
 * person differently — a national team roster publishes "Przemysław Kowalski"
 * and a body publishes "Przemysław K." — so matching across them by name would
 * mostly fail and would occasionally match the WRONG person. Each section
 * therefore lists only its own kind of membership.
 */
export function bodiesByPerson(
  bodies: GovernanceBody[],
): Map<string, { label: string; detail: string }[]> {
  const out = new Map<string, { label: string; detail: string }[]>();
  for (const body of bodies) {
    for (const m of body.members) {
      const list = out.get(m.display_name) ?? [];
      list.push({ label: body.name, detail: roleLabel(m.role) });
      out.set(m.display_name, list);
    }
  }
  for (const list of out.values()) list.sort((a, b) => a.label.localeCompare(b.label, "pl"));
  return out;
}

// ── Statute ─────────────────────────────────────────────────────────────────

export interface Statute {
  title: string;
  body_md: string;
  adopted_on: string | null;
  /* Provenance, both nullable, and neither is rendered: `source_file_url` is
   * the signed PDF in GCS when one exists (null for PZSurf — none has been
   * uploaded) and `source_url` the page it was transcribed from. Kept on the
   * interface because they are part of the API's shape, not because the dialog
   * shows them. */
  source_file_url: string | null;
  source_url: string | null;
}

export async function getStatute(): Promise<Statute> {
  const { data } = await fetchJson<Statute>(`/orgs/${ORG_SLUG}/statute`);
  return data;
}

// ── Documents and resolutions ───────────────────────────────────────────────

export interface PublicDocument {
  title: string;
  /** Optional ONLY because this page builds against the live API, which lags
   *  the repo — the field ships with surfpoland#33. Treat a missing value as
   *  "uncategorised" rather than assuming a shelf. */
  doc_type?: string;
  doc_date: string | null;
  file_url: string;
  file_name: string | null;
}

export interface PublicResolution {
  id: string;
  resolution_number: string | null;
  title: string;
  content: string | null;
  meeting_title: string;
  adopted_on: string | null;
}

export async function getDocuments(): Promise<PublicDocument[]> {
  const { data } = await fetchJson<PublicDocument[]>(`/orgs/${ORG_SLUG}/documents`);
  return data;
}

/**
 * Resolutions, or an empty list if the endpoint is not deployed yet.
 *
 * The ONLY tolerated failure in this client, and narrowly: a 404 means
 * surfpoland#33 has not shipped, and failing the whole build over a section
 * that cannot exist yet would take the entire site down with it. Every other
 * status still throws, because a 500 from a deployed endpoint IS a broken
 * build and must not publish a page with a silently missing section.
 *
 * Delete the tolerance once the endpoint is live — it is scaffolding, not a
 * pattern. A section that renders empty forever is the failure this guards
 * against becoming permanent.
 */
export async function getResolutions(): Promise<PublicResolution[]> {
  const res = await fetch(`${API_BASE}/orgs/${ORG_SLUG}/resolutions`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    console.warn("[api] /resolutions is not deployed yet — the Uchwały carousel will be empty.");
    return [];
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from /resolutions`);
  const first = (await res.json()) as
    { data: PublicResolution[]; meta?: { total?: number } };

  // PAGE THROUGH. The endpoint's default page is 50 and its hard cap is 100,
  // and this association already has 84 uchwały — a single unpaged request
  // silently dropped 34 of them, and a register missing a third of its entries
  // looks complete, which is the worst kind of wrong.
  const out = [...(first.data ?? [])];
  const total = first.meta?.total ?? out.length;
  while (out.length < total) {
    const page = await fetchJson<PublicResolution[]>(
      `/orgs/${ORG_SLUG}/resolutions?limit=100&offset=${out.length}`);
    if (!page.data?.length) break;   // never loop on an endpoint that stops moving
    out.push(...page.data);
  }
  return out;
}

/** Documents of one type, in the order the API returned them. */
export const documentsOfType = (docs: PublicDocument[], type: string): PublicDocument[] =>
  docs.filter((d) => d.doc_type === type);

// ── Partners ────────────────────────────────────────────────────────────────

export interface Partner {
  name: string;
  logo_url: string | null;
  url: string | null;
}

/**
 * The organisation's published partners.
 *
 * Empty is the NORMAL answer, not a failure: publication is opt-in per row and
 * most of the federation's are still off. The strip hides itself when this is
 * empty, the same way the document shelves do.
 *
 * Tolerates a 404 for as long as the endpoint is undeployed, exactly as
 * `getResolutions` did — and like that one, the tolerance is scaffolding to
 * delete once it is live.
 */
export async function getPartners(): Promise<Partner[]> {
  const res = await fetch(`${API_BASE}/orgs/${ORG_SLUG}/partners`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) {
    console.warn("[api] /partners is not deployed yet — the partners strip will be hidden.");
    return [];
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from /partners`);
  const body = (await res.json()) as { data: Partner[] };
  return body.data ?? [];
}
