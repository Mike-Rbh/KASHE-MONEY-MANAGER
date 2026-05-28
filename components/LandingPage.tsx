// components/LandingPage.tsx
// Pure Server Component — no 'use client' needed.

import SignInButton from '@/components/SignInButton';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-surface text-content">

      {/* ── Decorative background grid & circuit lines ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,224,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,224,122,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-80"
      />

      <svg
        className="absolute left-1/2 top-0 -translate-x-1/2 w-full max-w-xl h-[450px] opacity-[0.05] pointer-events-none select-none"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M 0,40 L 120,40 L 150,80 L 320,80 M 240,0 L 240,50 L 260,70 L 450,70" />
        <path d="M 50,150 L 180,150 L 210,190 L 210,280 L 230,300" />
        <circle cx="120" cy="40" r="4" fill="var(--color-accent)" />
        <circle cx="320" cy="80" r="4" fill="var(--color-accent)" />
        <circle cx="230" cy="300" r="4" fill="var(--color-accent)" />
      </svg>

      {/* ── Radial glow behind the hero text ────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-accent/8 blur-3xl"
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3.5 select-none">
          {/* Glowing SVG branding logo matching the authenticated view */}
          <svg className="h-8.5 w-8.5 text-accent" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="7.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M25 20V80" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M75 20L42.5 50L75 80" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M35 50H50" />
            <circle cx="25" cy="20" r="4" fill="var(--color-accent)" />
            <circle cx="25" cy="80" r="4" fill="var(--color-accent)" />
            <circle cx="75" cy="20" r="4" fill="var(--color-accent)" />
            <circle cx="75" cy="80" r="4" fill="var(--color-accent)" />
          </svg>
          <div className="flex items-center gap-2">
            <span className="font-sans text-base font-extrabold tracking-wider uppercase text-content">
              kashe
            </span>
            <span className="rounded-full border border-accent/30 bg-accent-dim/10 px-2.5 py-0.5 font-sans text-[0.55rem] font-bold uppercase tracking-widest text-accent">
              beta
            </span>
          </div>
        </div>

        <SignInButton variant="ghost" />
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-14 text-center max-w-4xl mx-auto w-full">

        {/* Eyebrow */}
        <div className="mb-7 flex items-center gap-2 rounded-full border border-accent/25 bg-accent-dim/5 px-4.5 py-1.5 backdrop-blur-md select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-sans text-[0.62rem] font-black uppercase tracking-widest text-accent leading-none">
            Offline-first · Syncs automatically
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-5 max-w-sm font-sans text-4xl sm:text-5xl font-black leading-tight tracking-tight text-content sm:max-w-xl select-none">
          Your money, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-400 font-black">
            always in sync.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mb-9 max-w-xs font-sans text-sm sm:text-base leading-relaxed text-muted sm:max-w-md">
          Kashe tracks income and expenses locally — even with no internet.
          When you're back online, everything syncs to the cloud silently.
        </p>

        {/* Primary CTA */}
        <div className="mb-4">
          <SignInButton variant="primary" />
        </div>

        {/* Social proof / trust line */}
        <p className="font-sans text-[0.6rem] font-extrabold uppercase tracking-widest text-muted/50 select-none">
          No credit card · Free during beta · Data is yours
        </p>

        {/* ── Feature cards (Glassmorphic outlined SVG Feature Blocks) ────── */}
        <div className="mt-16 grid w-full max-w-lg gap-4.5 sm:grid-cols-3">
          {[
            {
              title: 'Works Offline',
              body:  'Add transactions anywhere. Syncs when connectivity returns.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5 text-accent">
                  <path d="M4 11a9 9 0 0 1 9 9" />
                  <path d="M4 4a16 16 0 0 1 16 16" />
                  <circle cx="5" cy="19" r="1" fill="currentColor" />
                </svg>
              )
            },
            {
              title: 'Private by Design',
              body:  'Your data is stored locally first. Server sync is encrypted.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5 text-accent">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )
            },
            {
              title: 'Instant Updates',
              body:  'Zero loading spinners. Everything reads from local storage.',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-5.5 w-5.5 text-accent">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              )
            },
          ].map(card => (
            <div
              key={card.title}
              className="glass-panel relative rounded-2.5xl border border-border/30 bg-surface-2/30 p-5 text-left transition-all duration-300 hover:border-accent/35 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md"
            >
              {/* Icon Container with subtle neon ring background */}
              <div className="mb-4.5 flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 shadow-sm select-none">
                {card.icon}
              </div>
              
              <h2 className="mb-1.5 font-sans text-xs font-black uppercase tracking-wider text-content leading-none">
                {card.title}
              </h2>
              <p className="font-sans text-[0.7rem] leading-relaxed text-muted">
                {card.body}
              </p>
            </div>
          ))}
        </div>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-6 text-center select-none">
        <p className="font-sans text-[0.58rem] font-bold uppercase tracking-widest text-muted/30">
          © {new Date().getFullYear()} Kashe — Built by RBHWEBDEV
        </p>
      </footer>

    </div>
  );
}