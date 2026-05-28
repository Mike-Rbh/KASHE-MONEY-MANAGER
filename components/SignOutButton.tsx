'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { db } from '@/lib/db';

export default function SignOutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Wipe the local Dexie IndexedDB transactions table to prevent data leakage
      await db.transactions.clear();
      // 2. Wipe the last sync date so the next user gets a complete data sync
      localStorage.removeItem('lastSyncDate');
    } catch (err) {
      console.error('Failed to clear local database on sign out:', err);
    }
    
    // 3. Initiate NextAuth sign out
    await signOut();
  };

  return (
    <>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-dim/20 px-3.5 py-1.5 font-sans text-xs font-medium text-accent transition-all duration-200 cursor-pointer select-none hover:border-accent hover:bg-accent/15 active:scale-[0.96]"
      >
        <span>Sign Out</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>

      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/85 backdrop-blur-xl animate-fade-in transition-all">
          <div className="relative flex h-24 w-24 items-center justify-center">
            {/* Outer spinning neon ring */}
            <div className="absolute inset-0 animate-spin">
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="var(--color-accent)"
                  strokeWidth="3.5"
                  strokeDasharray="12, 20"
                  fill="none"
                  opacity="0.85"
                  className="drop-shadow-[0_0_8px_rgba(0,224,122,0.6)]"
                />
              </svg>
            </div>
            {/* Inner glowing logo icon */}
            <div className="h-12 w-12 rounded-xl bg-accent-dim/15 border border-accent/35 flex items-center justify-center shadow-[0_0_20px_rgba(0,224,122,0.35)] animate-pulse">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00e07a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_4px_rgba(0,224,122,0.7)]"
              >
                <path d="M4 22V2M20 22L4 12M4 12l16-10" />
              </svg>
            </div>
          </div>
          <p className="mt-6 font-sans text-sm font-semibold tracking-wider text-accent drop-shadow-[0_0_6px_rgba(0,224,122,0.3)] uppercase animate-pulse">
            Securing your data...
          </p>
          <p className="mt-1 font-sans text-xs text-muted">
            Disconnecting PWA session
          </p>
        </div>
      )}
    </>
  );
}