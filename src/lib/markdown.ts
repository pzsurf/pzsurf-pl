/**
 * Markdown → HTML for the association statute, rendered the way Shoreside
 * renders it (frontend/src/components/MarkdownBody.tsx + the `.statute-doc`
 * styles), so the statute on pzsurf.pl reads like the one in the platform.
 *
 * The pipeline mirrors MarkdownBody step for step:
 *
 *   1. `normalizeMarkdown` — copied verbatim from Shoreside — turns lettered
 *      points (`a.`, `b.`, `i.`) into bullet items that keep their letter.
 *   2. micromark + GFM, the parser react-markdown is built on (and the one
 *      lib/intro.ts already uses), with raw HTML escaped and dangerous link
 *      protocols dropped — which is what makes `set:html` safe.
 *   3. The two classes MarkdownBody adds:
 *        - `md-heading-line` on a paragraph that is only one bold run (`**§1**`)
 *          and on a capitals line straight under a heading (the chapter's
 *          name under `## ROZDZIAŁ I`) — the stylesheet centres them;
 *        - `md-lettered` on a list item that starts with its letter, so the
 *          bullet is hidden and the letter is the only marker.
 *
 * Step 3 runs over micromark's OUTPUT with regexes. That is sound only because
 * step 2 escaped every `<` in the source: each tag matched below is one
 * micromark wrote, in its own fixed shape.
 */
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { LETTER_MARKER, normalizeMarkdown } from "./normalizeMarkdown";

const render = (md: string): string =>
  micromark(md, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

/** `# Title` as the first non-blank line. ATX form only. */
const LEADING_H1 = /^\s*#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*(?:\n|$)/;

/** Text content of a fragment of micromark output, entities decoded enough to
 *  test case — `&amp;` and friends have no case of their own. */
const textOf = (html: string): string => html.replace(/<[^>]*>/g, "").trim();

/** All capitals, as a chapter's name under its number is written. Same test
 *  as MarkdownBody's `isCapitals`. */
function isCapitals(text: string): boolean {
  return /\p{Lu}/u.test(text) && text === text.toLocaleUpperCase("pl");
}

function markHeadingLines(html: string): string {
  return html
    // A paragraph that is nothing but one bold run: `**§ 1**`, `**ZARZĄD**`.
    .replace(/<p>(\s*<strong>(?:(?!<\/?strong>).)*<\/strong>\s*)<\/p>/g,
      '<p class="md-heading-line">$1</p>')
    // A line in capitals straight under a heading.
    .replace(/(<\/h[1-6]>\s*)<p>((?:(?!<\/p>)[\s\S])*)<\/p>/g, (all, head, inner) =>
      isCapitals(textOf(inner)) ? `${head}<p class="md-heading-line">${inner}</p>` : all);
}

/** `<li>a. …` (tight) or `<li>\n<p>a. …` (loose) → `md-lettered`. */
function markLettered(html: string): string {
  return html.replace(/<li>(\s*(?:<p>)?)([^<]*)/g, (all, lead, text) =>
    LETTER_MARKER.test(text) ? `<li class="md-lettered">${lead}${text}` : all);
}

export interface RenderedStatute {
  /** The document's own `# ` heading, lifted out so the dialog can title itself. */
  title: string | null;
  html: string;
}

export function renderStatute(md: string): RenderedStatute {
  const source = md ?? "";
  const match = LEADING_H1.exec(source);
  // Lifted, not rendered: the dialog puts it in its header, and printing it
  // twice reads as a mistake.
  const title = match ? match[1].replace(/\*\*/g, "").trim() : null;
  const body = match ? source.slice(match[0].length) : source;
  const html = markLettered(markHeadingLines(render(normalizeMarkdown(body))));
  return { title, html };
}
