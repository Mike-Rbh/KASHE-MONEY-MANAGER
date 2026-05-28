'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { db, LocalTransaction } from '@/lib/db';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Timeframe = 'month' | 'year' | 'all';

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLOR_INCOME  = '#00e07a';
const COLOR_EXPENSE = '#ff4757';
const COLOR_SURFACE = '#0d0d0d';
const COLOR_BORDER  = '#1a1a1a';
const COLOR_MUTED   = '#666666';
const COLOR_CONTENT = '#f0ede8';

// Palette for the expense donut slices with premium futuristic neon vibes.
const DONUT_PALETTE = [
  '#00e07a', '#7bed9f', '#ff4757', '#ffa502',
  '#70a1ff', '#eccc68', '#a29bfe', '#00cec9',
  '#fd79a8', '#ff6b35',
];

const CATEGORY_LABELS: Record<string, string> = {
  salary:        'Salary',
  freelance:     'Freelance',
  investment:    'Investment',
  gift:          'Gift',
  refund:        'Refund',
  other_income:  'Other Income',
  food:          'Food',
  transport:     'Transport',
  housing:       'Housing',
  utilities:     'Utilities',
  healthcare:    'Healthcare',
  entertainment: 'Entertainment',
  shopping:      'Shopping',
  education:     'Education',
  subscriptions: 'Subscriptions',
  other_expense: 'Other',
};

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return "DZD " + new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)
    return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

/** Returns the start-of-day Date for the beginning of the current month. */
function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Returns the start-of-day Date for the beginning of the current year. */
function startOfYear(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

// ─── Data derivation ───────────────────────────────────────────────────────────

interface DonutSlice {
  name:    string;
  value:   number;
  percent: number;
  color:   string;
}

interface BarDatum {
  label:   string;
  income:  number;
  expense: number;
}

interface DerivedData {
  income:     number;
  expenses:   number;
  net:        number;
  donut:      DonutSlice[];
  bars:       BarDatum[];
}

function deriveData(
  txs: LocalTransaction[],
  timeframe: Timeframe,
  categoryMap: Map<string, { emoji: string; label: string }>
): DerivedData {
  const cutoff =
    timeframe === 'month' ? startOfMonth() :
    timeframe === 'year'  ? startOfYear()  :
    null;

  const filtered = cutoff
    ? txs.filter(tx => toDate(tx.date) >= cutoff)
    : txs;

  let income   = 0;
  let expenses = 0;

  for (const tx of filtered) {
    if (tx.type === 'income')  income   += tx.amount;
    else                        expenses += tx.amount;
  }

  const catMap = new Map<string, number>();
  for (const tx of filtered) {
    if (tx.type !== 'expense') continue;
    catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + tx.amount);
  }

  const donut: DonutSlice[] = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, value], i) => {
      const catMeta = categoryMap.get(cat);
      const name = catMeta ? catMeta.label : (CATEGORY_LABELS[cat] ?? cat);
      return {
        name,
        value,
        percent: expenses > 0 ? Math.round((value / expenses) * 100) : 0,
        color:   DONUT_PALETTE[i % DONUT_PALETTE.length],
      };
    });

  let bars: BarDatum[];

  if (timeframe === 'month') {
    const weekMap = new Map<number, BarDatum>();
    for (const tx of filtered) {
      const d    = toDate(tx.date);
      const week = Math.floor((d.getDate() - 1) / 7) + 1;
      if (!weekMap.has(week))
        weekMap.set(week, { label: `Wk ${week}`, income: 0, expense: 0 });
      const bucket = weekMap.get(week)!;
      if (tx.type === 'income')  bucket.income  += tx.amount;
      else                        bucket.expense += tx.amount;
    }
    bars = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  } else if (timeframe === 'year') {
    const monthMap = new Map<number, BarDatum>();
    for (const tx of filtered) {
      const m = toDate(tx.date).getMonth();
      if (!monthMap.has(m))
        monthMap.set(m, { label: MONTH_LABELS[m], income: 0, expense: 0 });
      const bucket = monthMap.get(m)!;
      if (tx.type === 'income')  bucket.income  += tx.amount;
      else                        bucket.expense += tx.amount;
    }
    bars = Array.from(monthMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  } else {
    const yearMap = new Map<number, BarDatum>();
    for (const tx of txs) {
      const y = toDate(tx.date).getFullYear();
      if (!yearMap.has(y))
        yearMap.set(y, { label: String(y), income: 0, expense: 0 });
      const bucket = yearMap.get(y)!;
      if (tx.type === 'income')  bucket.income  += tx.amount;
      else                        bucket.expense += tx.amount;
    }
    bars = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }

  return { income, expenses, net: income - expenses, donut, bars };
}

// ─── Custom tooltip components ─────────────────────────────────────────────────

interface DonutPayload {
  name:    string;
  value:   number;
  payload: DonutSlice;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?:  boolean;
  payload?: DonutPayload[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: slice } = payload[0];
  return (
    <div
      className="rounded-2xl border border-border/50 bg-surface-2/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)] select-none pointer-events-none"
      style={{ borderColor: COLOR_BORDER, background: COLOR_SURFACE, pointerEvents: 'none' }}
    >
      <p className="font-sans text-xs font-bold uppercase tracking-wider"
         style={{ color: slice.color }}>
        {name}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold"
         style={{ color: COLOR_CONTENT }}>
        {formatCurrency(value)}
        <span className="ml-2 text-xs" style={{ color: COLOR_MUTED }}>
          {slice.percent}%
        </span>
      </p>
    </div>
  );
}

interface BarPayloadItem {
  name:    string;
  value:   number;
  color:   string;
  dataKey: string;
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?:  boolean;
  payload?: BarPayloadItem[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl border border-border/50 bg-surface-2/95 backdrop-blur-md px-3.5 py-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)] select-none pointer-events-none"
      style={{ borderColor: COLOR_BORDER, background: COLOR_SURFACE, pointerEvents: 'none' }}
    >
      <p className="mb-2 font-sans text-xs font-semibold tracking-wider"
         style={{ color: COLOR_MUTED }}>
        {label}
      </p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-3 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ background: p.dataKey === 'income' ? COLOR_INCOME : COLOR_EXPENSE }} />
          <span className="font-sans text-xs text-content capitalize">
            {p.dataKey}
          </span>
          <span className="ml-auto font-mono text-xs font-bold pl-4"
                style={{ color: p.dataKey === 'income' ? COLOR_INCOME : COLOR_EXPENSE }}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  loading,
}: {
  label:   string;
  value:   number;
  accent:  'green' | 'red' | 'neutral';
  loading: boolean;
}) {
  const colorMap = {
    green:   COLOR_INCOME,
    red:     COLOR_EXPENSE,
    neutral: COLOR_CONTENT,
  };
  const color = colorMap[accent];

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border/40 bg-surface-2/50 backdrop-blur-md p-3.5 shadow-sm">
      <p className="font-sans text-[0.6rem] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      {loading ? (
        <div className="h-6 w-24 animate-pulse rounded bg-surface-3/50" />
      ) : (
        <p className="font-mono text-base sm:text-lg font-bold tracking-tight"
           style={{ color }}>
          {accent === 'green' && value > 0 ? '+' : ''}
          {formatCurrency(value)}
        </p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title:    string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-3xl p-4.5 shadow-md">
      <div className="mb-4">
        <h2 className="font-sans text-sm font-bold text-content leading-none">{title}</h2>
        {subtitle && (
          <p className="mt-1 font-sans text-[0.62rem] font-medium uppercase tracking-wider text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 shadow-[0_0_15px_rgba(0,224,122,0.15)] text-accent" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_4px_rgba(0,224,122,0.4)]"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      <p className="font-sans text-xs text-muted">{message}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('month');

  // Query categories dynamically
  const categoriesList = useLiveQuery(() => db.categories.toArray());
  const categoryMap = useMemo(() => {
    const map = new Map<string, { emoji: string; label: string }>();
    if (categoriesList) {
      for (const cat of categoriesList) {
        map.set(cat.id, { emoji: cat.emoji, label: cat.label });
      }
    }
    return map;
  }, [categoriesList]);

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('syncStatus')
        .notEqual('deleted')
        .toArray(),
    [],
  );

  const loading = transactions === undefined;

  const { income, expenses, net, donut, bars } = useMemo(
    () => deriveData(transactions ?? [], timeframe, categoryMap),
    [transactions, timeframe, categoryMap],
  );

  return (
    <div className="min-h-dvh bg-surface pb-28 max-w-6xl mx-auto w-full md:px-4">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-surface-2/70 px-4 pb-3.5 pt-5 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
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
            <h1 className="font-sans text-base font-bold text-content">
              Analytics Insights
            </h1>
          </div>
        </div>

        {/* Timeframe toggle */}
        <div
          role="group"
          aria-label="Timeframe filter"
          className="flex rounded-xl border border-border/30 bg-surface-3/30 p-1 backdrop-blur-md"
        >
          {(
            [
              { value: 'month', label: 'This Month' },
              { value: 'year',  label: 'This Year'  },
              { value: 'all',   label: 'All Time'   },
            ] as { value: Timeframe; label: string }[]
          ).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeframe(opt.value)}
              aria-pressed={timeframe === opt.value}
              className={[
                'flex-1 rounded-lg py-2 font-sans text-xs font-semibold transition-all duration-150',
                timeframe === opt.value
                  ? 'bg-accent text-surface font-bold shadow-md shadow-accent/25'
                  : 'text-muted hover:text-content',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <main className="flex flex-col gap-6 px-4 pt-6">

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <SummaryCard label="Income"   value={income}   accent="green"   loading={loading} />
          <SummaryCard label="Expenses" value={expenses} accent="red"     loading={loading} />
          <SummaryCard label="Net Flow" value={net}      accent={net >= 0 ? 'green' : 'red'} loading={loading} />
        </div>

        {/* Two-Column Responsive Chart Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          
          {/* Left Column: Expense Breakdown Donut */}
          <div className="w-full">
            <ChartCard
              title="Expense Breakdown"
              subtitle="By category breakdown"
            >
              {loading ? (
                <div className="h-56 animate-pulse rounded-2xl bg-surface-2/45" />
              ) : donut.length === 0 ? (
                <EmptyChart message="No expenses recorded for this period." />
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={donut}
                          cx="50%"
                          cy="50%"
                          innerRadius="58%"
                          outerRadius="80%"
                          paddingAngle={3.5}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {donut.map((slice, i) => (
                            <Cell key={i} fill={slice.color} className="outline-none" />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<DonutTooltip />}
                          cursor={false}
                          wrapperStyle={{ pointerEvents: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Visual ring in the middle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <span className="font-sans text-[0.62rem] font-bold text-muted uppercase tracking-wider">Total</span>
                      <span className="font-mono text-sm sm:text-base font-bold text-content mt-0.5">
                        {formatCurrency(expenses)}
                      </span>
                    </div>
                  </div>

                  {/* Manual legend */}
                  <ul className="mt-4 flex flex-col divide-y divide-border/20">
                    {donut.map((slice, i) => (
                      <li key={i} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-3 w-3 flex-shrink-0 rounded-full"
                            style={{ background: slice.color, boxShadow: `0 0 6px ${slice.color}55` }}
                          />
                          <span className="truncate font-sans text-xs font-semibold text-content">
                            {slice.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted">
                            {slice.percent}%
                          </span>
                          <span className="font-mono text-xs font-bold text-content">
                            {formatCurrency(slice.value)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>
          </div>

          {/* Right Column: Cash Flow History & Savings Rate */}
          <div className="flex flex-col gap-6 w-full">
            <ChartCard
              title="Cash Flow History"
              subtitle={
                timeframe === 'month' ? 'Weekly — current month' :
                timeframe === 'year'  ? 'Monthly — current year' :
                'Yearly — all time'
              }
            >
              {loading ? (
                <div className="h-56 animate-pulse rounded-2xl bg-surface-2/45" />
              ) : bars.length === 0 ? (
                <EmptyChart message="No transactions recorded for this period." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={bars}
                      margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
                      barGap={5}
                    >
                      {/* SVG Gradient definitions for glowing neon fills */}
                      <defs>
                        <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00e07a" stopOpacity={1} />
                          <stop offset="100%" stopColor="#00e07a" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff4757" stopOpacity={1} />
                          <stop offset="100%" stopColor="#ff4757" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="rgba(255, 255, 255, 0.03)"
                        vertical={false}
                        strokeDasharray="0"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255, 255, 255, 0.35)", fontSize: 10, fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompact}
                        tick={{ fill: "rgba(255, 255, 255, 0.35)", fontSize: 10, fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        content={<BarTooltip />}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                        wrapperStyle={{ pointerEvents: 'none' }}
                      />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="url(#incomeBarGrad)"
                        stroke="#00e07a"
                        strokeWidth={1}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={12}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(0, 224, 122, 0.2))' }}
                      />
                      <Bar
                        dataKey="expense"
                        name="Expense"
                        fill="url(#expenseBarGrad)"
                        stroke="#ff4757"
                        strokeWidth={1}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={12}
                        style={{ filter: 'drop-shadow(0 0 6px rgba(255, 71, 87, 0.2))' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* High-fidelity custom legend matching the premium design reference */}
                  <div className="mt-4.5 flex items-center justify-center gap-6 border-t border-border/25 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,224,122,0.6)]" />
                      <span className="font-sans text-[0.62rem] font-bold uppercase tracking-wider text-muted hover:text-content transition-colors select-none">
                        Income
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_8px_rgba(255,71,87,0.6)]" />
                      <span className="font-sans text-[0.62rem] font-bold uppercase tracking-wider text-muted hover:text-content transition-colors select-none">
                        Expense
                      </span>
                    </div>
                  </div>
                </>
              )}
            </ChartCard>

            {/* ── Savings rate card ───────────────────────────────────────────── */}
            {!loading && income > 0 && (
              <section
                aria-label="Savings rate"
                className="glass-panel rounded-3xl p-4.5 shadow-sm w-full"
              >
                <div className="mb-3.5 flex items-baseline justify-between">
                  <h2 className="font-sans text-sm font-bold text-content">
                    Savings Rate
                  </h2>
                  <span
                    className="font-mono text-lg font-bold text-accent"
                  >
                    {income > 0 ? Math.round((net / income) * 100) : 0}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width:      `${Math.min(100, Math.max(0, income > 0 ? (net / income) * 100 : 0))}%`,
                      background: net >= 0 ? COLOR_INCOME : COLOR_EXPENSE,
                    }}
                  />
                </div>

                <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-widest text-muted">
                  {net >= 0
                    ? `You saved ${formatCurrency(net)} of your ${formatCurrency(income)} income`
                    : `Spending exceeded income by ${formatCurrency(Math.abs(net))}`}
                </p>
              </section>
            )}
          </div>

        </div>

        {/* ── No data at all ──────────────────────────────────────────────── */}
        {!loading && transactions?.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <span className="text-5xl" aria-hidden="true">📈</span>
            <p className="font-sans text-sm font-medium text-content">
              No data yet
            </p>
            <p className="font-sans text-xs text-muted">
              Add some transactions to see your analytics.
            </p>
            <Link
              href="/add"
              className="mt-2 rounded-xl bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-surface transition-all hover:brightness-110 active:scale-95"
            >
              Add transaction
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}