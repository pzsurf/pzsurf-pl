/**
 * Markdown → HTML for ONE document: the association statute.
 *
 * **Why this exists rather than a dependency.** The statute arrives from the
 * API as 42k characters of Markdown and something has to render it. Adding
 * `marked` or a remark pipeline would be a new runtime dependency for a page
 * whose entire dependency list is currently `astro`, and Astro's own Markdown
 * pipeline only renders files it owns, not strings fetched at build time.
 *
 * What makes a hand-rolled converter defensible here is that the input is not
 * arbitrary Markdown. Measured against the live document, it uses exactly five
 * constructs and nothing else:
 *
 *     h1              1     ordered list   192  (nested two deep)
 *     h2              8     paragraph      190
 *     **bold**       47
 *
 * No links, no images, no tables, no code, no blockquotes, no raw HTML.
 *
 * **The safety property that matters.** Everything is HTML-escaped FIRST and
 * formatting is applied to the escaped text afterwards, so nothing in the
 * document can introduce markup. A construct this does not recognise is
 * emitted as an escaped paragraph — the failure mode is a stray `>` or a
 * literal `- ` visible in the text, never broken or injected HTML. Unrecognised
 * lines are also reported so the build can say so out loud rather than quietly
 * degrading a legal document.
 *
 * If the statute ever grows tables or links, add them here deliberately — or
 * take the dependency then, with a reason.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Escape, THEN format. `*` survives escaping, so the order is safe. */
const inline = (s: string): string =>
  escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const HEADING = /^(#{1,6})\s+(.*)$/;
/** `1.` `a.` `ii.` — and the `)` form too, which this document does not use
 *  but every other Polish statute might. */
const LIST_ITEM = /^(\s*)([0-9]+|[a-z]+)[.)]\s+(.*)$/;

/* The statute nests three deep and changes marker style at each level:
 *
 *     1.  ...                 indent 0    decimal
 *         a.  ...             indent 4    lower-alpha
 *             i.  ...         indent 8    lower-roman
 *
 * DEPTH decides which, not the marker text, because `i.` is a valid lower-alpha
 * marker AND a valid lower-roman one and only its position says which is meant.
 * Getting that wrong would renumber a sub-clause of a legal document. */
const MARKER_TYPE = ["1", "a", "i"] as const;

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };

/** The marker's ordinal, so `<li value>` reproduces the source exactly rather
 *  than letting the browser count from one. Null when it cannot be read, which
 *  leaves the browser to count — a wrong-looking number beats a crash. */
function ordinal(marker: string, depth: number): number | null {
  if (/^[0-9]+$/.test(marker)) return parseInt(marker, 10) || null;
  if (depth === 1 && /^[a-z]$/.test(marker)) return marker.charCodeAt(0) - 96;
  if (/^[ivxlc]+$/.test(marker)) {
    let total = 0;
    for (let i = 0; i < marker.length; i++) {
      const here = ROMAN[marker[i]];
      const next = ROMAN[marker[i + 1]];
      if (!here) return null;
      total += next && next > here ? -here : here;
    }
    return total || null;
  }
  if (/^[a-z]$/.test(marker)) return marker.charCodeAt(0) - 96;
  return null;
}

export interface RenderedStatute {
  /** The document's own `# ` heading, lifted out so the dialog can title itself. */
  title: string | null;
  html: string;
  /** Lines no rule matched. Empty on the document this was written for. */
  unhandled: string[];
}

export function renderStatute(md: string): RenderedStatute {
  const out: string[] = [];
  const unhandled: string[] = [];
  /** Indent width of each currently-open <ol>, outermost first. */
  const open: number[] = [];
  let title: string | null = null;

  const closeAllLists = () => {
    while (open.length) {
      out.push("</li></ol>");
      open.pop();
    }
  };

  for (const raw of md.split("\n")) {
    if (!raw.trim()) continue; // blank lines only ever separate blocks here

    const list = LIST_ITEM.exec(raw);
    if (list) {
      const [, indent, marker, text] = list;
      const width = indent.length;

      if (!open.length || width > open[open.length - 1]) {
        // Deeper: nest inside the <li> that is still open above.
        const depth = open.length;
        const type = MARKER_TYPE[Math.min(depth, MARKER_TYPE.length - 1)];
        out.push(`<ol type="${type}">`);
        open.push(width);
      } else {
        while (open.length > 1 && width < open[open.length - 1]) {
          out.push("</li></ol>");
          open.pop();
        }
        out.push("</li>"); // close the sibling item
      }
      // `value` on every item rather than `start` on the list: the numbering of
      // a statute is part of what it SAYS — §12 ust. 3 lit. a is a citable
      // address — so each marker is carried through from the source rather
      // than inferred by the browser from position.
      const n = ordinal(marker, open.length - 1);
      out.push(`<li${n === null ? "" : ` value="${n}"`}>${inline(text)}`);
      continue;
    }

    const heading = HEADING.exec(raw.trim());
    if (heading) {
      closeAllLists();
      const [, hashes, text] = heading;
      if (hashes.length === 1 && title === null) {
        // The document's own title. Lifted out, not emitted — the dialog puts
        // it in its header, and printing it twice reads as a mistake.
        title = text.trim();
        continue;
      }
      const level = Math.min(hashes.length, 6);
      out.push(`<h${level}>${inline(text)}</h${level}>`);
      continue;
    }

    // Anything else is prose. A line that was meant to be some construct this
    // does not know still renders as readable text, which is the point.
    closeAllLists();
    const trimmed = raw.trim();
    // The SPACE is what makes these list/quote syntax. Without it this flagged
    // every `**§1**` in the document — 47 of them — as an unhandled bullet,
    // which is bold prose it renders perfectly well.
    if (/^([-*+>]\s|\||```|\[)/.test(trimmed)) unhandled.push(trimmed.slice(0, 80));
    out.push(`<p>${inline(trimmed)}</p>`);
  }

  closeAllLists();
  return { title, html: out.join("\n"), unhandled };
}
