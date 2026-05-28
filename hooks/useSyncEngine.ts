// hooks/useSyncEngine.ts
'use client';

import { useEffect, useCallback } from 'react';
import { runSync } from '@/lib/sync';

export function useSyncEngine(isAuthenticated: boolean) {
    const handleSync = useCallback(async () => {
        if (!isAuthenticated) return;

        // Only attempt sync if we have internet
        if (typeof window !== 'undefined' && navigator.onLine) {
            try {
                const lastSyncString = localStorage.getItem('lastSyncDate');
                const lastSyncDate = lastSyncString ? new Date(lastSyncString) : undefined;

                await runSync(lastSyncDate);
                console.log('Sync completed successfully');
            } catch (error) {
                console.error('Background sync failed:', error);
            }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // 1. Sync immediately when the app loads
        handleSync();

        // 2. Sync whenever the browser regains internet connection
        window.addEventListener('online', handleSync);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('online', handleSync);
        };
    }, [handleSync, isAuthenticated]);

    return { triggerSync: handleSync };
}