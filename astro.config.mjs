// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import { isOn } from "./src/lib/features.ts";
import memberArea from "./src/member/integration.ts";

// The config runs before Astro loads .env for the pages, so read it here the
// same way (and the same rule: src/lib/features.ts).
const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");
const MEMBER_AREA = isOn(process.env.PUBLIC_MEMBER_AREA ?? env.PUBLIC_MEMBER_AREA);

// STATIC output, deliberately. Every page is real HTML written at build time
// from the public API, because the link previews this site will live or die by
// — Facebook, Messenger, WhatsApp, LinkedIn, X — do not execute JavaScript.
// A client-rendered page gives every shared link the same generic preview
// whichever team or event was actually shared. Google would cope; they will not.
//
// The corollary is that content is as fresh as the last build, which is why
// .github/workflows/publish.yml rebuilds on a schedule as well as on push.
export default defineConfig({
  site: "https://pzsurf.pl",
  output: "static",
  build: { format: "directory" },
  devToolbar: { enabled: false },
  // The member area's pages exist only when the toggle is on (README → Member area).
  integrations: [memberArea(MEMBER_AREA)],
  // Poll for changes when surfpoland's dev-start.sh says the checkout is on a
  // mount that sends no file-change events (a 9p share from a VM host): without
  // it an edit never re-renders. Off everywhere else; polling costs CPU.
  vite: {
    server: {
      watch: process.env.DEV_WATCH_POLLING ? { usePolling: true, interval: 300 } : undefined,
    },
  },
});
