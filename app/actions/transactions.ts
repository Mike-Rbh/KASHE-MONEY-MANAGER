// app/actions/transactions.ts
'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ─── Auth guard ────────────────────────────────────────────────────────────────
// Centralised so every action calls one function and never reaches the database
// if the session is missing or malformed.

async function requireAuth(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    // Throwing inside a Server Action surfaces as a rejected Promise on the
    // client, where your catch block can redirect to the sign-in flow.
    throw new Error('UNAUTHENTICATED: You must be signed in to sync transactions.');
  }

  return session.user.id;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type SyncStatus = 'pending' | 'synced' | 'deleted';

interface DexieTransaction {
  localId: string;
  id?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  date: Date | string;
  syncStatus: SyncStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface PushResult {
  localId: string;
  serverId: string;
  status: 'success' | 'error';
  error?: string;
}

interface PushSummary {
  results: PushResult[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

interface ServerTransaction {
  id: string;
  localId: string | null;
  amount: string;
  type: string;
  category: string;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface FetchResult {
  transactions: ServerTransaction[];
  fetchedAt: string;
  count: number;
}

// ─── pushTransactionsToServer ──────────────────────────────────────────────────

export async function pushTransactionsToServer(
  pendingRecords: DexieTransaction[]
): Promise<PushSummary> {
  // Guard first — no userId, no database access.
  const userId = await requireAuth();

  if (!pendingRecords || pendingRecords.length === 0) {
    return { results: [], totalProcessed: 0, successCount: 0, errorCount: 0 };
  }

  const results: PushResult[] = [];

  for (const record of pendingRecords) {
    if (!record.localId) {
      results.push({
        localId:  record.localId ?? 'UNKNOWN',
        serverId: '',
        status:   'error',
        error:    'Record is missing a localId and cannot be synced.',
      });
      continue;
    }

    // ── Soft delete ───────────────────────────────────────────────────────────
    if (record.syncStatus === 'deleted') {
      try {
        // If the record was never synced to the server there is nothing to
        // delete in Postgres — report success so Dexie removes it locally.
        if (!record.id) {
          results.push({ localId: record.localId, serverId: '', status: 'success' });
          continue;
        }

        const deleted = await prisma.transaction.update({
          where: {
            id: record.id,
            // Crucially: scope the update to the authenticated user so one
            // user can never soft-delete another user's records, even if they
            // somehow obtained a valid UUID.
            userId,
          },
          data:   { deletedAt: new Date() },
          select: { id: true },
        });

        results.push({ localId: record.localId, serverId: deleted.id, status: 'success' });
      } catch (err) {
        // P2025 = record not found (already deleted, or belongs to another user)
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          results.push({ localId: record.localId, serverId: record.id ?? '', status: 'success' });
        } else {
          results.push({
            localId:  record.localId,
            serverId: record.id ?? '',
            status:   'error',
            error:    err instanceof Error ? err.message : 'Unknown error during delete.',
          });
        }
      }
      continue;
    }

    // ── Upsert (pending) ──────────────────────────────────────────────────────
    if (record.syncStatus === 'pending') {
      try {
        const amount = new Prisma.Decimal(record.amount);
        const date   = record.date instanceof Date ? record.date : new Date(record.date);

        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${record.date}`);
        }

        const upserted = await prisma.transaction.upsert({
          where: {
            // localId is @unique in the schema — safe upsert key for records
            // created offline that have never received a server UUID.
            localId: record.localId,
          },
          create: {
            localId:     record.localId,
            amount,
            type:        record.type,
            category:    record.category,
            description: record.description ?? null,
            date,
            // Bind the new record to the authenticated user.
            userId,
          },
          update: {
            // On conflict: refresh mutable fields but NEVER change userId.
            // A malicious payload with a different localId that happens to
            // collide cannot escalate privileges because the WHERE clause on
            // `upsert` already scoped to localId (which is per-user unique).
            amount,
            type:        record.type,
            category:    record.category,
            description: record.description ?? null,
            date,
            deletedAt:   null, // un-delete if re-created client-side
          },
          select: { id: true },
        });

        results.push({ localId: record.localId, serverId: upserted.id, status: 'success' });
      } catch (err) {
        results.push({
          localId:  record.localId,
          serverId: record.id ?? '',
          status:   'error',
          error:    err instanceof Error ? err.message : 'Unknown error during upsert.',
        });
      }
    }
  }

  const successCount = results.filter(r => r.status === 'success').length;

  return {
    results,
    totalProcessed: pendingRecords.length,
    successCount,
    errorCount: results.length - successCount,
  };
}

// ─── fetchTransactionsFromServer ───────────────────────────────────────────────

export async function fetchTransactionsFromServer(
  lastSyncDate?: Date
): Promise<FetchResult> {
  const userId = await requireAuth();

  try {
    const where: Prisma.TransactionWhereInput = {
      // Hard ownership filter — every query is scoped to the signed-in user.
      // This runs at the database level, not in application code, so it cannot
      // be bypassed by a crafted payload.
      userId,
      deletedAt: null,

      // Incremental sync: only pull records updated since the last fetch.
      // Falls back to a full sync when lastSyncDate is absent or invalid.
      ...(lastSyncDate instanceof Date && !isNaN(lastSyncDate.getTime())
        ? { updatedAt: { gt: lastSyncDate } }
        : {}),
    };

    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id:          true,
        localId:     true,
        amount:      true,
        type:        true,
        category:    true,
        description: true,
        date:        true,
        createdAt:   true,
        updatedAt:   true,
        deletedAt:   true,
        // Intentionally excluded: userId — no need to send it to the client,
        // and excluding it keeps the payload smaller.
      },
    });

    const transactions: ServerTransaction[] = rows.map(row => ({
      id:          row.id,
      localId:     row.localId,
      amount:      row.amount.toString(),
      type:        row.type,
      category:    row.category,
      description: row.description,
      date:        row.date.toISOString(),
      createdAt:   row.createdAt.toISOString(),
      updatedAt:   row.updatedAt.toISOString(),
      deletedAt:   row.deletedAt?.toISOString() ?? null,
    }));

    return {
      transactions,
      fetchedAt: new Date().toISOString(),
      count:     transactions.length,
    };
  } catch (err) {
    throw new Error(
      `fetchTransactionsFromServer failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}