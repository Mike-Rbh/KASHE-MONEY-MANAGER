// components/ClientSyncEngine.tsx
'use client';

import { useSyncEngine } from '@/hooks/useSyncEngine';

export function ClientSyncEngine({ isAuthenticated }: { isAuthenticated: boolean }) {
    // This hook silently manages syncing in the background
    useSyncEngine(isAuthenticated);

    // It renders nothing visually
    return null;
}