/**
 * The federation's introduction — Markdown written in the platform — rendered
 * for the hero.
 *
 * **Why a dependency here, when the statute has none.** lib/markdown.ts is
 * hand-rolled because the statute uses five constructs and nothing else, and it
 * says to take a dependency the day the input stops being that. This input is
 * that day: people write it in an editor, so it has links, images, emphasis and
 * whatever else CommonMark allows. micromark is also the parser the platform's
 * own preview is built on (react-markdown uses it), so the hero shows what the
 * editor showed — a second Markdown dialect here would turn the preview into a
 * guess. It runs at BUILD time only; the site still ships no JavaScript.
 *
 * **Why `set:html` is safe with this.** micromark escapes raw HTML in the source
 * rather than passing it through, and drops `javascript:`-style link targets.
 * Both are its defaults, and both are spelled out below anyway so nobody
 * "simplifies" them away. The platform additionally refuses, before the text is
 * stored, any image that is not in its own storage.
 */
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

export interface RenderedIntro {
  /** The text's own leading `# ` heading, as inline HTML, lifted out to be the
   *  page's h1. Null when the text does not start with one. */
  titleHtml: string | null;
  html: string;
}

const render = (md: string): string =>
  micromark(md, {
    allowDangerousHtml: false,
    allowDangerousProtocol: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });

/** `# Title` as the first non-blank line. ATX form only. */
const LEADING_H1 = /^\s*#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*(?:\n|$)/;

export function renderIntro(md: string): RenderedIntro {
  const match = LEADING_H1.exec(md);
  const body = match ? md.slice(match[0].length) : md;
  // Rendered as a paragraph and unwrapped, so emphasis or a link in the heading
  // survives into the h1.
  const titleHtml = match
    ? render(match[1]).trim().replace(/^<p>([\s\S]*)<\/p>$/, "$1")
    : null;
  // The page has ONE h1, the hero's; any further `# ` heading steps down to h2.
  // A string replace is sound here only because raw HTML in the source was
  // escaped above — every `<h1>` left in the output is one micromark wrote.
  const html = render(body).replace(/<(\/?)h1>/g, "<$1h2>");
  return { titleHtml, html };
}
