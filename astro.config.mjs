// @ts-check
import { defineConfig } from "astro/config";

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
  // Poll for changes when surfpoland's dev-start.sh says the checkout is on a
  // mount that sends no file-change events (a 9p share from a VM host): without
  // it an edit never re-renders. Off everywhere else; polling costs CPU.
  vite: {
    server: {
      watch: process.env.DEV_WATCH_POLLING ? { usePolling: true, interval: 300 } : undefined,
    },
  },
});
