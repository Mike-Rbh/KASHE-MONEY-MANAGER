// app/settings/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { db, LocalTransaction } from '@/lib/db';
import { runSync } from '@/lib/sync';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ActionState = 'idle' | 'loading' | 'success' | 'error';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatLastSynced(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown';

  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000); // seconds

  if (diff < 10)  return 'Just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  return d.toLocaleDateString('en-GB', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function transactionsToCsv(
  rows: LocalTransaction[]
): string {
  const header = ['Date', 'Amount', 'Type', 'Category', 'Description'].join(',');

  const body = rows.map(tx => {
    const date = tx.date instanceof Date
      ? tx.date.toISOString().split('T')[0]
      : new Date(tx.date).toISOString().split('T')[0];

    return [
      escapeCsvField(date),
      escapeCsvField(tx.amount),
      escapeCsvField(tx.type),
      escapeCsvField(tx.category),
      escapeCsvField(tx.description ?? ''),
    ].join(',');
  });

  return [header, ...body].join('\r\n');
}

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  description,
  children,
  danger = false,
}: {
  label:       string;
  description?: string;
  children:    React.ReactNode;
  danger?:     boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className={[
          'font-sans text-sm font-semibold',
          danger ? 'text-danger' : 'text-content',
        ].join(' ')}>
          {label}
        </p>
        {description && (
          <p className="mt-1 font-sans text-xs text-muted leading-tight">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border/20" />;
}

function StateIcon({ state }: { state: ActionState }) {
  if (state === 'loading') {
    return (
      <svg
        className="animate-spin"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }
  if (state === 'success') {
    return (
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (state === 'error') {
    return (
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    );
  }
  return null;
}

interface ActionButtonProps {
  label:       string;
  state:       ActionState;
  onClick:     () => void;
  variant?:    'default' | 'danger';
  stateLabels?: Partial<Record<ActionState, string>>;
}

function ActionButton({
  label,
  state,
  onClick,
  variant = 'default',
  stateLabels = {},
}: ActionButtonProps) {
  const isLoading = state === 'loading';

  const displayLabel =
    stateLabels[state] ?? (state === 'idle' ? label : state === 'loading' ? '…' : label);

  const baseClasses = [
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2',
    'font-sans text-xs font-bold uppercase tracking-wider',
    'border transition-all duration-150 cursor-pointer select-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2',
    'active:scale-95',
  ];

  const variantClasses =
    variant === 'danger'
      ? [
          'border-danger/40 bg-danger/10 text-danger hover:border-danger hover:bg-danger/25 hover:shadow-[0_0_8px_rgba(255,71,87,0.2)]',
          'focus-visible:ring-danger/50',
        ]
      : [
          'border-accent/40 bg-accent-dim/15 text-accent hover:border-accent hover:bg-accent/20 hover:shadow-[0_0_8px_rgba(0,224,122,0.2)]',
          'focus-visible:ring-accent/50',
          state === 'success' ? 'border-accent bg-accent/25 text-accent shadow-[0_0_12px_rgba(0,224,122,0.3)] font-bold' : '',
          state === 'error'   ? 'border-danger bg-danger/10 text-danger'  : '',
        ];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={[...baseClasses, ...variantClasses].join(' ')}
    >
      <StateIcon state={state} />
      {displayLabel}
    </button>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2
        id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="mb-2 px-1 font-sans text-xs font-bold uppercase tracking-wider text-muted"
      >
        {title}
      </h2>
      <div className="divide-y divide-border/20 rounded-3xl border border-border/30 bg-surface-2/45 backdrop-blur-md px-4.5 shadow-sm">
        {children}
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [syncState,   setSyncState]   = useState<ActionState>('idle');
  const [exportState, setExportState] = useState<ActionState>('idle');
  const [wipeState,   setWipeState]   = useState<ActionState>('idle');
  const [lastSynced,  setLastSynced]  = useState<string | null>(null);
  const [syncError,   setSyncError]   = useState<string | null>(null);

  useEffect(() => {
    setLastSynced(localStorage.getItem('lastSyncDate'));
  }, []);

  const handleSync = useCallback(async () => {
    setSyncState('loading');
    setSyncError(null);

    try {
      const lastSyncDate = lastSynced ? new Date(lastSynced) : undefined;
      await runSync(lastSyncDate);

      const updated = localStorage.getItem('lastSyncDate');
      setLastSynced(updated);
      setSyncState('success');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncError(err instanceof Error ? err.message : 'Unknown error — check your connection.');
      setSyncState('error');
    } finally {
      setTimeout(() => setSyncState('idle'), 3000);
    }
  }, [lastSynced]);

  const handleExport = useCallback(async () => {
    setExportState('loading');

    try {
      const rows = await db.transactions
        .filter(tx => tx.syncStatus !== 'deleted')
        .toArray();

      if (rows.length === 0) {
        setExportState('success');
        setTimeout(() => setExportState('idle'), 2000);
        return;
      }

      rows.sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date);
        const db_ = b.date instanceof Date ? b.date : new Date(b.date);
        return db_.getTime() - da.getTime();
      });

      const csv      = transactionsToCsv(rows);
      const dateStamp = new Date().toISOString().split('T')[0];
      triggerCsvDownload(csv, `kashe-export-${dateStamp}.csv`);

      setExportState('success');
    } catch (err) {
      console.error('Export failed:', err);
      setExportState('error');
    } finally {
      setTimeout(() => setExportState('idle'), 3000);
    }
  }, []);

  const handleWipe = useCallback(async () => {
    const confirmed = window.confirm(
      'Wipe all local data?\n\n' +
      'This clears every transaction from this device. ' +
      'Data already synced to the server is safe and will re-download on next sync. ' +
      'Unsynced (pending) transactions will be permanently lost.\n\n' +
      'This action cannot be undone.'
    );
    if (!confirmed) return;

    setWipeState('loading');

    try {
      await db.transactions.clear();
      localStorage.removeItem('lastSyncDate');
      setLastSynced(null);
      setWipeState('success');
    } catch (err) {
      console.error('Wipe failed:', err);
      setWipeState('error');
    } finally {
      setTimeout(() => setWipeState('idle'), 3000);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await db.transactions.clear();
      localStorage.removeItem('lastSyncDate');
    } catch (err) {
      console.error('Failed to clear local database on sign out:', err);
    }
    
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div className="min-h-dvh bg-surface pb-28 max-w-5xl mx-auto w-full md:px-4">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-surface-2/70 px-4 pb-3.5 pt-5 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-dim/10 text-accent transition-all duration-150 hover:border-accent hover:bg-accent-dim/20 hover:shadow-[0_0_10px_rgba(0,224,122,0.15)] active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="font-sans text-base font-bold text-content leading-none">
            Settings & Control
          </h1>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <main className="flex flex-col gap-6 px-4 pt-6">

        {/* Dual-Column Grid on Widescreen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
          
          {/* Left Column: Data & Export Control */}
          <div className="flex flex-col gap-6 w-full">
            
            {/* ── Section 1: Data & Sync ────────────────────────────────── */}
            <SettingsSection title="Data &amp; Synchronization">
              <SettingsRow
                label="Force Cloud Sync"
                description={`Last cloud handshake: ${formatLastSynced(lastSynced)}`}
              >
                <ActionButton
                  label="Sync Now"
                  state={syncState}
                  onClick={handleSync}
                  stateLabels={{
                    loading: 'Syncing',
                    success: 'Synced',
                    error:   'Failed',
                  }}
                />
              </SettingsRow>

              {syncState === 'error' && syncError && (
                <div className="pb-3 px-1">
                  <p className="rounded-xl border border-danger/35 bg-danger-dim/15 px-3.5 py-2 font-mono text-[0.62rem] leading-relaxed text-danger animate-breathe">
                    {syncError}
                  </p>
                </div>
              )}
            </SettingsSection>

            {/* ── Section 2: Export ─────────────────────────────────────── */}
            <SettingsSection title="Export Ledger">
              <SettingsRow
                label="Export as Spreadsheet"
                description="Downloads all logged transactions in CSV format"
              >
                <ActionButton
                  label="Export CSV"
                  state={exportState}
                  onClick={handleExport}
                  stateLabels={{
                    loading: 'Exporting',
                    success: 'Downloaded',
                    error:   'Failed',
                  }}
                />
              </SettingsRow>
            </SettingsSection>

          </div>

          {/* Right Column: Account Security & Danger Wipes */}
          <div className="flex flex-col gap-6 w-full">
            
            {/* ── Section 3: Account & Danger Zone ─────────────────────── */}
            <SettingsSection title="Account Security">
              <SettingsRow
                label="Account Sign Out"
                description="Wipes local temporary state and signs you out"
              >
                <ActionButton
                  label="Sign Out"
                  state="idle"
                  onClick={handleSignOut}
                />
              </SettingsRow>

              <Divider />

              <SettingsRow
                label="Wipe Local IndexedDB"
                description="Clears offline tables. Server-synced transactions are safe."
                danger
              >
                <ActionButton
                  label="Wipe Data"
                  state={wipeState}
                  onClick={handleWipe}
                  variant="danger"
                  stateLabels={{
                    loading: 'Wiping',
                    success: 'Cleared',
                    error:   'Failed',
                  }}
                />
              </SettingsRow>
            </SettingsSection>

          </div>

        </div>

        {/* ── App info footer ───────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <p className="font-sans text-[0.65rem] font-bold uppercase tracking-wider text-muted/50">
            Kashe Personal Finance Tracker
          </p>
          <p className="font-sans text-[0.6rem] font-medium text-muted/30">
            v1.0.0-beta · PWA Enabled Offline First
          </p>
        </div>

      </main>
    </div>
  );
}