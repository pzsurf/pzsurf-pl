// The member area's pages, added to the build ONLY when the toggle is on.
//
// They live in src/member/pages/, not src/pages/, because Astro builds every
// file in src/pages/ no matter what: a page there would ship with the toggle
// off. Here a page exists in the output only if this integration injects it.
//
// When adding a page, add its route below and nowhere else.
import type { AstroIntegration } from "astro";

const ROUTES: { pattern: string; entrypoint: string }[] = [
  // Placeholder until slice 3 builds the account pages. It exists so an ON
  // build has something at /konto/ for the deploy check to find.
  { pattern: "/konto", entrypoint: "./src/member/pages/konto/index.astro" },
  // THROWAWAY: the slice 1 cookie spike. Removed with its page.
  { pattern: "/konto/spike", entrypoint: "./src/member/pages/konto/spike.astro" },
];

export default function memberArea(on: boolean): AstroIntegration {
  return {
    name: "pzsurf-member-area",
    hooks: {
      "astro:config:setup": ({ injectRoute, logger }) => {
        if (!on) return;
        for (const route of ROUTES) injectRoute(route);
        logger.info(`member area ON: ${ROUTES.map((r) => r.pattern).join(", ")}`);
      },
    },
  };
}
