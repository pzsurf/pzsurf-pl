// COPIED from shoreside/frontend/src/components/normalizeMarkdown.ts, so the
// statute here is parsed exactly as the platform parses it (react-markdown →
// micromark, after this same normalisation). Keep the two in step: a change
// there that is not mirrored here makes pzsurf.pl render a different document.
//
// Making GFM tables render in two authoring cases the spec otherwise rejects,
// and lettered points (a., b), …) render as points — see `letteredPoints`.
//
// Lifted out of MarkdownBody so it can be tested on its own: it is the only
// logic in that file, it runs over every resolution body and every meeting note,
// and what it does is invisible until a table silently shows up as raw pipes.
//
// The two cases, both of which come from people pasting tables in:
//
//   1. A table cannot interrupt a paragraph. One with no blank line above it is
//      swallowed into the paragraph and rendered as literal `|` characters.
//   2. A table needs a header row before its delimiter (`|---|`). A table pasted
//      starting at the delimiter has none, so the whole block is not a table.

const _isRow = (l: string) => /^\s*\|/.test(l);
const _isDelim = (l: string) => l.includes("|") && /-/.test(l) && /^[\s|:-]+$/.test(l.trim());
const _colCount = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").length;

// ── Lettered points ─────────────────────────────────────────────────────────
//
// Markdown has numbered lists (`1.`) and bullets (`-`), and nothing for the
// lettered points every Polish legal text uses (`a)`, `b.` under `§ 9 pkt 7`).
// To a Markdown parser `a. text` is ordinary text, so a run of them is joined
// into the point above as one paragraph — the whole of `a.`…`f.` on one line.
//
// They are turned into bullet items that KEEP their letter as text
// (`- a. text`); MarkdownBody hides the bullet on an item that starts with a
// letter marker, so the reader sees `a.` exactly as written. Only a single
// letter counts (so `np. …` is left alone), and only where a point is expected:
// under a list item, under another lettered point, or after a line ending in a
// colon ("Związek ma prawo do:").

// A letter, or a roman numeral for the level below one (`i.`, `ii.`, `iii.`).
const _letter = /^(\s*)([a-z]|[ivx]+)([.)])\s+(\S.*)$/;
const _listItem = /^(\s*)(\d+[.)]|[-*+])(\s+)\S/;
export const LETTER_MARKER = /^([a-z]|[ivx]+)[.)]\s/;

const _indent = (line: string) => line.length - line.trimStart().length;

function letteredPoints(lines: string[]): string[] {
  const out: string[] = [];
  // Where a lettered point may start: the column it is written at, or null
  // where none is expected (after ordinary prose).
  let base: number | null = null;
  // The open lettered levels: the indent each was written with in the source,
  // and the column it was written at here. Deeper source indent = a level down.
  let levels: { src: number; col: number }[] = [];
  let afterBlank = false;
  for (const line of lines) {
    if (line.trim() === "") { out.push(line); afterBlank = true; continue; }
    const m = _letter.exec(line);
    if (m && base !== null) {
      const src = m[1]!.length;
      while (levels.length && levels[levels.length - 1]!.src > src) levels.pop();
      const top = levels[levels.length - 1];
      let col: number;
      if (top && top.src === src) col = top.col;
      else {
        // A level below the one open (or the first): two columns in, which is
        // where the text of "- " starts.
        col = top ? top.col + 2 : base;
        levels.push({ src, col });
      }
      out.push(`${" ".repeat(col)}- ${m[2]}${m[3]} ${m[4]}`);
      afterBlank = false;
      continue;
    }
    out.push(line);
    const item = _listItem.exec(line);
    if (item) {
      // A point under a list item sits at that item's content column, which is
      // what makes it the item's sub-list rather than a list of its own.
      base = item[1]!.length + item[2]!.length + item[3]!.length;
      levels = [];
    } else if (line.trimEnd().endsWith(":") && !(base !== null && _indent(line) > 0)) {
      // A sentence ending in a colon starts a list of its own (a bullet list
      // may interrupt a paragraph), at the margin.
      base = 0;
      levels = [];
    } else if (base !== null && (!afterBlank || _indent(line) > 0)) {
      // A line straight under a point (no blank line between) is more of that
      // point in Markdown, like the "– jeżeli…" that closes a run of roman
      // sub-points in the PZSurf statute: the points carry on after it.
    } else {
      base = null;
      levels = [];
    }
    afterBlank = false;
  }
  return out;
}

export function normalizeMarkdown(md: string | null | undefined): string {
  const lines = letteredPoints((md || "").split("\n"));
  const out: string[] = [];
  for (const line of lines) {
    const prev = out.length ? out[out.length - 1]! : "";
    if (_isDelim(line) && !_isRow(prev)) {
      // Delimiter with no header above it — add a blank line (if needed) and an
      // empty header row so the block is a valid table.
      if (prev.trim() !== "") out.push("");
      out.push("|" + " |".repeat(_colCount(line)));
      out.push(line);
      continue;
    }
    if (_isRow(line) && prev.trim() !== "" && !_isRow(prev)) out.push("");
    out.push(line);
  }
  return out.join("\n");
}
