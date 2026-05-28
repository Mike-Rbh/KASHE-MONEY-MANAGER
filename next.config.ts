// next.config.ts
import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  // ── Service worker source ───────────────────────────────────────────────
  // Path to your sw.ts, relative to the project root.
  swSrc: 'app/sw.ts',

  // ── Service worker output ───────────────────────────────────────────────
  // Where @serwist/next writes the compiled + precache-injected worker.
  // Must be inside `public/` so Next.js serves it from the root scope.
  swDest: 'public/sw.js',

  // ── Precache manifest ───────────────────────────────────────────────────
  // @serwist/next auto-generates this file and injects the list of all
  // Next.js build assets into your service worker at build time.
  // The path must match the import inside app/sw.ts exactly.
  additionalPrecacheEntries: [],

  // ── Development mode ────────────────────────────────────────────────────
  // Keep the service worker disabled in development so hot-reload works
  // normally and you don't chase stale-cache bugs during coding.
  // Set to `true` temporarily if you need to test SW behaviour locally.
  disable: process.env.NODE_ENV === 'development',

  // ── Registration strategy ───────────────────────────────────────────────
  // 'autoUpdate' re-registers the SW automatically when a new build
  // is deployed, so users get the updated app shell without manual refresh.
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Enable Turbopack in development by providing an empty config block
  turbopack: {},

  experimental: {
    // Required for Next.js 15 Server Actions to work correctly.
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default withSerwist(nextConfig);