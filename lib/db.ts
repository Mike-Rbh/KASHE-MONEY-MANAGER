// lib/db.ts
// Money Management PWA — Dexie.js (IndexedDB) configuration
// Install: npm install dexie

import Dexie, { type EntityTable } from "dexie";

// ─────────────────────────────────────────────
// Enums  (mirror prisma/schema.prisma)
// ─────────────────────────────────────────────

export type TransactionType = "income" | "expense";

export type TransactionCategory =
  // Income
  | "salary"
  | "freelance"
  | "investment"
  | "gift"
  | "refund"
  | "other_income"
  // Expense
  | "food"
  | "transport"
  | "housing"
  | "utilities"
  | "healthcare"
  | "entertainment"
  | "shopping"
  | "education"
  | "subscriptions"
  | "other_expense";

// ─────────────────────────────────────────────
// Sync status
// ─────────────────────────────────────────────

/**
 * "pending"  — created / mutated offline; not yet pushed to the server.
 * "synced"   — the server has acknowledged this record.
 * "deleted"  — soft-deleted locally; the delete must still be sent to server.
 */
export type SyncStatus = "pending" | "synced" | "deleted";

// ─────────────────────────────────────────────
// Local entities
// ─────────────────────────────────────────────

export interface LocalCategory {
  id: string; // "salary", "food", or custom Generated ID (cat_ts_rand)
  label: string;
  emoji: string;
  type: TransactionType;
  isCustom: boolean;
  isOneTime?: boolean; // flag for temporary categories
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // soft-delete timestamp!
}

export interface LocalTransaction {
  /**
   * Auto-incremented primary key for Dexie (++localId).
   * Stored as a string so it can be sent to the server as the
   * `localId` column, enabling de-duplication on first sync.
   */
  localId: string; // e.g. "lx_1716758400000_abc12"

  /**
   * UUID assigned by the server after the first successful sync.
   * Undefined until the record has been synced at least once.
   */
  id?: string;

  // ── Mirror of server schema fields ─────────
  amount: number;                 // stored as float; server uses Decimal
  type: TransactionType;
  category: string;               // changed from TransactionCategory to support dynamic custom categories
  description?: string;
  date: Date;                     // native Date for IDBKeyRange date queries

  // ── Offline-first metadata ─────────────────
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;               // set when soft-deleting locally
}

// ─────────────────────────────────────────────
// Helper — generate a collision-resistant localId
// ─────────────────────────────────────────────

export function generateLocalId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `lx_${ts}_${rand}`;
}

export function getDefaultCategories(): LocalCategory[] {
  const now = new Date();
  return [
    // Income
    { id: 'salary', label: 'Salary', emoji: '💼', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'freelance', label: 'Freelance', emoji: '💻', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'investment', label: 'Investment', emoji: '📈', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'gift', label: 'Gift', emoji: '🎁', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'refund', label: 'Refund', emoji: '↩️', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'other_income', label: 'Other Income', emoji: '💰', type: 'income', isCustom: false, createdAt: now, updatedAt: now },
    // Expense
    { id: 'food', label: 'Food', emoji: '🍔', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'transport', label: 'Transport', emoji: '🚌', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'housing', label: 'Housing', emoji: '🏠', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'utilities', label: 'Utilities', emoji: '💡', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'healthcare', label: 'Healthcare', emoji: '🏥', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎬', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'education', label: 'Education', emoji: '📚', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'subscriptions', label: 'Subscriptions', emoji: '🔁', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
    { id: 'other_expense', label: 'Other', emoji: '📦', type: 'expense', isCustom: false, createdAt: now, updatedAt: now },
  ];
}

// ─────────────────────────────────────────────
// Dexie database class
// ─────────────────────────────────────────────

class MoneyDB extends Dexie {
  transactions!: EntityTable<LocalTransaction, "localId">;
  categories!: EntityTable<LocalCategory, "id">;

  constructor() {
    super("MoneyManagementDB");

    this.version(1).stores({
      transactions: [
        "&localId",        // primary key — unique
        "id",              // server UUID (nullable until synced)
        "date",            // IDBKeyRange date queries
        "type",            // filter income / expense
        "category",        // filter by category
        "syncStatus",      // pull all "pending" records during sync
        "[type+date]",     // compound: type + date range
        "[syncStatus+updatedAt]", // compound: find pending sorted by age
      ].join(", "),
    });

    this.version(2).stores({
      transactions: [
        "&localId",        // primary key — unique
        "id",              // server UUID (nullable until synced)
        "date",            // IDBKeyRange date queries
        "type",            // filter income / expense
        "category",        // filter by category
        "syncStatus",      // pull all "pending" records during sync
        "[type+date]",     // compound: type + date range
        "[syncStatus+updatedAt]", // compound: find pending sorted by age
      ].join(", "),
      categories: "&id, type, deletedAt",
    });
  }
}

// ─────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────

export const db = new MoneyDB();

// Seed default categories when the DB is ready
db.on("ready", async () => {
  try {
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkPut(getDefaultCategories());
    }
  } catch (err) {
    console.error("Failed to seed default categories:", err);
  }
});

// ─────────────────────────────────────────────
// CRUD helpers
// ─────────────────────────────────────────────

/** Add a new transaction locally (always starts as "pending"). */
export async function addTransaction(
  data: Omit<LocalTransaction, "localId" | "syncStatus" | "createdAt" | "updatedAt">
): Promise<LocalTransaction> {
  const now = new Date();
  const record: LocalTransaction = {
    ...data,
    localId: generateLocalId(),
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.add(record);
  return record;
}

/** Update a transaction and mark it pending re-sync. */
export async function updateTransaction(
  localId: string,
  patch: Partial<Omit<LocalTransaction, "localId" | "createdAt">>
): Promise<void> {
  await db.transactions.update(localId, {
    ...patch,
    syncStatus: "pending",
    updatedAt: new Date(),
  });
}

/** Soft-delete: mark as "deleted" so the sync layer can propagate. */
export async function deleteTransaction(localId: string): Promise<void> {
  await db.transactions.update(localId, {
    syncStatus: "deleted",
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
}

/** Return all non-deleted transactions sorted by date descending. */
export async function listTransactions(): Promise<LocalTransaction[]> {
  const arr = await db.transactions
    .where("syncStatus")
    .notEqual("deleted")
    .sortBy("date");
  return arr.reverse();
}

/** Return every record that needs to be pushed to the server. */
export async function getPendingTransactions(): Promise<LocalTransaction[]> {
  return db.transactions
    .where("syncStatus")
    .anyOf("pending", "deleted")
    .toArray();
}

/**
 * Called after a successful sync response.
 * Maps server UUIDs back to local records and marks them "synced".
 */
export async function markSynced(
  results: { localId: string; serverId: string }[]
): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    for (const { localId, serverId } of results) {
      await db.transactions.update(localId, {
        id: serverId,
        syncStatus: "synced",
        updatedAt: new Date(),
      });
    }
  });
}

/**
 * Upsert records pulled from the server (e.g., on first load or
 * after a long offline period). Uses localId as the merge key when
 * present, otherwise falls back to server id.
 */
export async function upsertFromServer(
  serverRecords: Array<Omit<LocalTransaction, "syncStatus">>
): Promise<void> {
  const records = serverRecords.map((r) => ({
    ...r,
    syncStatus: "synced" as SyncStatus,
  }));
  await db.transactions.bulkPut(records);
}

/** Add a custom category. If isOneTime is true, it is soft-deleted immediately so it won't appear in future transaction options but can be resolved in ledger/analytics. */
export async function addCustomCategory(
  label: string,
  emoji: string,
  type: TransactionType,
  isOneTime: boolean = false
): Promise<LocalCategory> {
  const now = new Date();
  const id = isOneTime
    ? `cat_ot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    : `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: LocalCategory = {
    id,
    label,
    emoji,
    type,
    isCustom: true,
    isOneTime,
    createdAt: now,
    updatedAt: now,
    deletedAt: isOneTime ? now : undefined,
  };
  await db.categories.add(record);
  return record;
}

/** Soft-delete a custom category. */
export async function softDeleteCategory(id: string): Promise<void> {
  await db.categories.update(id, {
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
}

