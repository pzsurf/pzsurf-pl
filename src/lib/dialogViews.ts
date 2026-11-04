// Views inside one dialog: a list, a body, a person — each a <section
// data-view="…"> child of a <dialog data-views>, all rendered at build time.
// A button with `data-show-view="x"` shows view x in place of the current one;
// the first view is where every opening starts.
//
// Going BACK (to the view this one was opened from) puts focus on the button
// that opened it, so a keyboard or screen-reader user is where they were.
//
// Used by GroupDialog and BodyGroupDialog. Bound once per dialog: both
// components import this, and Astro may run both of their scripts.

export function bindDialogViews(root: ParentNode = document): void {
  for (const dialog of root.querySelectorAll<HTMLDialogElement>("dialog[data-views]")) {
    if (dialog.dataset.viewsBound) continue;
    dialog.dataset.viewsBound = "1";
    const views = [...dialog.querySelectorAll<HTMLElement>(":scope > [data-view]")];
    const first = views[0]?.dataset.view;
    if (!first) continue;

    const show = (name: string, focus?: HTMLElement | null) => {
      for (const v of views) v.hidden = v.dataset.view !== name;
      const shown = views.find((v) => v.dataset.view === name);
      for (const s of shown?.querySelectorAll<HTMLElement>("[data-view-scroll]") ?? []) s.scrollTo(0, 0);
      (focus ?? shown?.querySelector<HTMLElement>("[data-show-view]"))?.focus();
    };

    for (const btn of dialog.querySelectorAll<HTMLElement>("[data-show-view]")) {
      btn.addEventListener("click", () => {
        const target = btn.dataset.showView!;
        const from = btn.closest<HTMLElement>("[data-view]")?.dataset.view;
        // Back to where it was opened from: focus the opener there.
        const opener = from
          ? dialog.querySelector<HTMLElement>(`[data-view="${target}"] [data-show-view="${from}"]`)
          : null;
        show(target, opener);
      });
    }
    // Every opening starts on the first view, whatever was showing at close.
    dialog.addEventListener("close", () => {
      for (const v of views) v.hidden = v.dataset.view !== first;
    });
  }
}
