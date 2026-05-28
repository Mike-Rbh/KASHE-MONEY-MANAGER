// components/Dashboard.tsx
// Server Component shell — receives the authenticated user from page.tsx and
// renders the header and the Dexie-powered client component below it.

import type { Session } from 'next-auth';
import DashboardClient from '@/components/DashboardClient';
import SignOutButton from '@/components/SignOutButton';

interface DashboardProps {
  user: Session['user'];
}

export default function Dashboard({ user }: DashboardProps) {
  return (
    <div className="min-h-dvh bg-surface px-4 pb-28 pt-6 md:pt-8 md:pb-8 max-w-7xl mx-auto w-full">

      {/* ── App bar ───────────────────────────────────────────────────────── */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Glowing SVG K Logo */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 shadow-[0_0_15px_rgba(0,224,122,0.2)]">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00e07a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_6px_rgba(0,224,122,0.7)]"
            >
              <path d="M4 22V2M20 22L4 12M4 12l16-10M12 7l8 5-8 5" />
            </svg>
          </div>

          <div>
            <p className="font-sans text-sm font-light text-muted leading-tight">
              Welcome back,
            </p>
            <p className="font-sans text-xl font-bold text-content leading-tight">
              {user.name?.split(' ')[0] ?? 'User'}
            </p>
          </div>
        </div>

        <div className="md:hidden">
          <SignOutButton />
        </div>
      </header>

      {/* ── All Dexie/live-query logic lives in the client component ─────── */}
      <DashboardClient />

    </div>
  );
}