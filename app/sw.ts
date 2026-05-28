// app/sw.ts
// This file is compiled by @serwist/next into public/sw.js at build time.
// It runs INSIDE the service worker — not in the browser main thread.
// Do NOT import any Next.js, React, or DOM modules here.

import { defaultCache } from '@serwist/next/worker';
import { Serwist }      from 'serwist';

// @serwist/next injects the precache manifest into this variable at build
// time via Webpack. The type declaration below satisfies TypeScript.
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  // ── Precache ────────────────────────────────────────────────────────────
  // __SW_MANIFEST is replaced at build time with the full list of versioned
  // Next.js build assets (JS chunks, CSS, fonts, static files in /public).
  // These are cached on service worker install so the app shell is available
  // instantly — and fully offline — after the first visit.
  precacheEntries: self.__SW_MANIFEST,

  // ── Skip waiting ────────────────────────────────────────────────────────
  // Activate the new service worker immediately when a build update is
  // deployed, without waiting for all existing browser tabs to close.
  // Pair with `clients.claim()` so the new SW takes control right away.
  skipWaiting:  true,
  clientsClaim: true,

  // ── Navigation preload ──────────────────────────────────────────────────
  // Fires a network request for the navigation in parallel with SW boot,
  // cutting the startup latency for navigations on a live connection.
  navigationPreload: true,

  // ── Runtime caching ─────────────────────────────────────────────────────
  // `defaultCache` from @serwist/next ships sensible strategies for the
  // asset types Next.js produces:
  //
  //   • JS / CSS chunks      → CacheFirst  (content-hashed; safe to cache forever)
  //   • Google Fonts CSS     → StaleWhileRevalidate
  //   • Google Fonts woff2   → CacheFirst  (1 year TTL)
  //   • next/image responses → StaleWhileRevalidate
  //   • Navigation (HTML)    → NetworkFirst (always tries network; falls back to cache)
  //
  // You can push extra entries here. See the Serwist docs for the full
  // RuntimeCaching type:
  // https://serwist.pages.dev/docs/serwist/core/serwist
  runtimeCaching: [
    ...defaultCache,

    // ── Offline fallback for API routes ──────────────────────────────────
    // When the user is offline and a Server Action or API route fails,
    // this catch-handler lets you surface a graceful error rather than a
    // browser "No internet" page. Uncomment and point to your fallback:
    //
    // {
    //   matcher: /^\/api\//,
    //   handler: new NetworkOnly({
    //     networkTimeoutSeconds: 10,
    //     plugins: [
    //       new FallbackPlugin({ fallbacks: { offline: '/offline.json' } }),
    //     ],
    //   }),
    // },
  ],
});

serwist.addEventListeners();