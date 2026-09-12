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

## Design

`src/styles/tokens.css` is the design language, and is currently a **marked
placeholder** — provisional greys chosen so an unstyled page reads as
unfinished rather than as a decision. Every visual value in every component
resolves to a token there, so adopting the real design language is a change to
one file. Two layers, borrowed from the platform's own stylesheet: `--palette-*`
says what the colours are, `--color-*` says what they are for.

## Deploying

Firebase Hosting site `pzsurf-pl` in the `pzsurf-platform` project, eventually
serving `pzsurf.pl`. `dist/` is plain static files, so the platform repo's
`deploy_hosting.py` works against it unchanged.
