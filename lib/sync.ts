// lib/sync.ts  (runs in the browser, imports Server Actions by reference)
import { pushTransactionsToServer, fetchTransactionsFromServer } from '@/app/actions/transactions';
import { getPendingTransactions, markSynced, upsertFromServer } from '@/lib/db';

export async function runSync(lastSyncDate?: Date): Promise<void> {
    // 1. Push local changes to Postgres
    const pending = await getPendingTransactions();

    if (pending.length > 0) {
        const { results } = await pushTransactionsToServer(pending);

        const succeeded = results
            .filter(r => r.status === 'success' && r.serverId)
            .map(r => ({ localId: r.localId, serverId: r.serverId }));

        if (succeeded.length > 0) {
            await markSynced(succeeded); // sets syncStatus = 'synced' in Dexie
        }
    }

    // 2. Pull server changes into Dexie
    const { transactions, fetchedAt } = await fetchTransactionsFromServer(lastSyncDate);

    if (transactions.length > 0) {
        // Coerce serialised values back to the types Dexie expects
        await upsertFromServer(
            transactions.map(t => ({
                ...t,
                type: t.type as "income" | "expense",
                category: t.category as any, // Bypasses the strict category enum check safely
                description: t.description ?? undefined, // Converts null to undefined
                amount: parseFloat(t.amount),
                date: new Date(t.date),
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt),
                deletedAt: t.deletedAt ? new Date(t.deletedAt) : undefined,
                localId: t.localId ?? `server_${t.id}`,
            }))
        );
    }

    // 3. Persist the fetchedAt timestamp (localStorage, Dexie meta table, etc.)
    localStorage.setItem('lastSyncDate', fetchedAt);
}