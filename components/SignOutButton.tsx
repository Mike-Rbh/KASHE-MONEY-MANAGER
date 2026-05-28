'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { db } from '@/lib/db';
import SignOutLoader from './SignOutLoader';

export default function SignOutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('isLoggingOut', 'true');
    }
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

      <SignOutLoader visible={isLoggingOut} />
    </>
  );
}