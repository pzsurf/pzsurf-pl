# pzsurf.pl

The Polski Związek Surfingu website. A **statically generated** site that reads
the federation's own record from the surfpoland public API and writes it into
HTML at build time.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (real HTML, no JavaScript)
```

## Why static, and not a single-page app

The messengers people actually share links in — Facebook, Messenger, WhatsApp,
LinkedIn, X — build a link preview by fetching the URL and reading `og:*` from
the **raw HTML**, and **none of them execute JavaScript**. Google's crawler
does, so search would survive a client-rendered page; sharing never would.
Every shared link would carry the same generic preview whichever squad or event
was actually shared.

So each page is written at build time with its content and its own share
metadata already in the markup. The current build ships **zero JavaScript**.

## Where the content comes from

Everything is `https://api.surfpoland.com/api/v0/public` — contract at
[`/public-v0.md`](https://api.surfpoland.com/public-v0.md). There is no
database, no CMS and no server here: `astro build` calls the API, writes HTML,
and that HTML is the website.

The API is **v0 and deliberately unstable** — fields may be renamed or removed
while the version still reads v0, each change recorded in the contract. So
`src/lib/api.ts` fails the build loudly on a bad response rather than emitting
a page that is quietly empty.

Two of its rules show up directly on the page and must not be worked around:

- **Names arrive abbreviated** (`Marta B.`) where the API decided they must be.
  A minor gets an abbreviated surname, and an unknown date of birth counts as
  minor. The abbreviation *is* the privacy control — never expand or re-join it.
- **A photograph needs consent**; a name and an office do not. `image_url` is
  null unless that person consented, so a roster without photographs is the
  system working, not data missing.

## Freshness

Content is as current as the last build. `.github/workflows/publish.yml`
rebuilds on a schedule and on demand, so an edit in the platform reaches the
site without anybody deploying by hand. Where that is not fast enough for a
particular list, the fix is a small client-side island refreshing that one
list against the live API — which is what the API's 30s `s-maxage` is for.

> Two different TTLs, easily conflated: the **API's** 30s window protects the
> single Cloud Run instance behind it, and the **CDN's** cache window governs
> this site's HTML. Neither is the other.

## Assets

`public/` holds the federation's own imagery, **copied in rather than linked**
from surfpoland.com:

| File | From |
|---|---|
| `hero.mp4`, `hero-poster.jpg` | the platform's landing hero — the same footage |
| `pzsurf-mark.png` | the federation's mark; also the favicon |

Copied because a site that cannot render without another site's assets is not
independent, and a hotlink breaks silently the day that path changes. The cost
is ~5 MB in the repository, paid once.

## Design

`src/styles/tokens.css` is the design language, and is currently a **marked
placeholder** — provisional greys chosen so an unstyled page reads as
unfinished rather than as a decision. Every visual value in every component
resolves to a token there, so adopting the real design language is a change to
one file. Two layers, borrowed from the platform's own stylesheet: `--palette-*`
says what the colours are, `--color-*` says what they are for.

## Analytics

Google Analytics 4, **off until configured** and **off until the reader
consents**. With no measurement id the site ships no banner, no script and no
cookies. The mechanism is in `src/lib/analytics.ts` (read its header before
changing it), the question in `src/components/ConsentBanner.astro`, and the
settings and privacy information on `/pliki-cookies/`.

How consent works, in short:

- Nothing is requested from Google before "Akceptuję": Consent Mode v2 in its
  *basic* form. The *advanced* form sends cookieless pings without consent,
  which EU regulators dispute; a public body's site should not be the test case.
- Accept and reject are equal buttons on the first screen; the choice can be
  changed any time on `/pliki-cookies/` (linked in every footer), and
  withdrawing deletes the `_ga` cookies at once.
- Analytics only: Google signals and ad personalisation off, every advertising
  consent signal denied. Cookies expire after 13 months; the choice is asked
  again after 12, or immediately after a `VERSION` bump in `lib/analytics.ts`
  (do that whenever the site starts asking for something new).
- Only readers who accept are counted, so the numbers undercount real traffic,
  typically by a third to a half in the EU. That is the price of doing it
  lawfully; compare trends, not absolute totals.

### Turning it on

1. **Create the property.** At <https://analytics.google.com>, with the
   federation's own Google account (not a personal one): *Admin → Create →
   Account* "Polski Związek Surfingu", then *Property* "pzsurf.pl", time zone
   *Poland*, currency *PLN*. Business details: any; objectives: *Understand web
   and/or app traffic*.
2. **Add the web stream.** *Admin → Data collection and modification → Data
   streams → Add stream → Web*, URL `https://pzsurf.pl`. Keep **Enhanced
   measurement** on: it records page views, scrolls, outbound clicks and
   **file downloads** (the PDFs in Dokumenty) with no code here. Copy the
   **Measurement ID** (`G-XXXXXXXXXX`).
3. **Set the privacy settings the `/pliki-cookies/` page promises.** These are
   what the page tells readers; if you change one, change the page.
   - *Admin → Data collection and modification → Data retention*: **14 months**
     for event data (the default is 2).
   - *Admin → Data collection and modification → Data collection*: leave
     **Google signals off**, and turn **Granular location and device data
     collection** off for the EU.
   - *Admin → Account settings*: accept the **Data Processing Terms**
     (Google as processor), and in *Data sharing settings* turn everything off.
4. **Give it to the build.** GitHub → pzsurf/pzsurf-pl → *Settings → Secrets
   and variables → Actions → Variables → New repository variable*:
   `PUBLIC_GA_ID` = the Measurement ID. A variable, not a secret: the id is
   public in every page that loads analytics. The next release or scheduled
   publish picks it up; a malformed id fails the build rather than shipping.
   Locally: `cp .env.example .env` and fill it in.
5. **Check it.** Open the released site in a private window: the banner shows,
   and the browser's network tab shows **no** request to Google. Accept: GA's
   *Reports → Realtime* shows you within a minute. Then on `/pliki-cookies/`
   choose *Nie zgadzam się*: the `_ga` cookies disappear.

### The dashboard

GA4's built-in reports cover most of what the federation needs:

- *Reports → Realtime*: who is on the site now. Useful on competition days
  and right after an announcement is shared.
- *Reports → Engagement → Pages and screens*: which pages are read. Each
  ogłoszenie and uchwała has its own address, so each is its own row.
- *Reports → Acquisition → Traffic acquisition*: where visitors come from
  (Facebook, Instagram, search, direct).
- *Reports → Engagement → Events*, event `file_download`: which documents are
  downloaded; `click` with an outbound link shows visits sent on to partners.

For one page the board can open, build it in **Looker Studio**
(<https://lookerstudio.google.com>, free, same Google account): *Create →
Report → Google Analytics* → the pzsurf.pl property. A useful first page:

| Chart | Dimension | Metric |
|---|---|---|
| Scorecards | — | Active users, Views, Average engagement time |
| Time series | Date | Active users |
| Table | Page title | Views, Average engagement time |
| Pie | Session source / medium | Sessions |
| Table (filter: Event name = `file_download`) | File name | Event count |
| Geo map | Region | Active users |

Set the date control to *Last 28 days*, then *Share* it with the board (view
access). Reports only ever show aggregated, consented data.

## Deploying

Firebase Hosting site `pzsurf-pl` in the `pzsurf-platform` project, eventually
serving `pzsurf.pl`. `dist/` is plain static files, so the platform repo's
`deploy_hosting.py` works against it unchanged.
