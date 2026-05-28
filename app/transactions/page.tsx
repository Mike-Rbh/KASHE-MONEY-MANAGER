// app/transactions/page.tsx
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalTransaction, deleteTransaction } from '@/lib/db';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return "DZD " + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateFull(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
  });
}

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Groups an array of transactions into buckets keyed by a "YYYY-MM-DD" string
 * so we can render date-section headers in the list.
 */
function groupByDate(
  txs: LocalTransaction[]
): { dateKey: string; label: string; items: LocalTransaction[] }[] {
  const map = new Map<string, LocalTransaction[]>();

  for (const tx of txs) {
    const d   = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(tx);
  }

  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey     = toKey(today);
  const yesterdayKey = toKey(yesterday);

  return Array.from(map.entries()).map(([dateKey, items]) => {
    let label: string;
    if (dateKey === todayKey)          label = 'Today';
    else if (dateKey === yesterdayKey) label = 'Yesterday';
    else {
      const d = new Date(`${dateKey}T00:00:00`);
      label   = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return { dateKey, label, items };
  });
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// (Category metadata is loaded dynamically from IndexedDB)

// ─── Sub-components ────────────────────────────────────────────────────────────

function renderSvgByKey(key: string, className: string): React.ReactNode {
  const p = {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className,
  };
  switch (key) {
    case 'briefcase':
      return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
    case 'laptop':
      return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="12" y1="17" x2="12" y2="20"/></svg>;
    case 'bar-chart':
      return <svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    case 'gift':
      return <svg {...p}><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 5a3 3 0 1 0-3-3m3 3a3 3 0 1 1 3-3"/><line x1="12" y1="8" x2="12" y2="22"/><line x1="3" y1="12" x2="21" y2="12"/></svg>;
    case 'rotate-ccw':
      return <svg {...p}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;
    case 'dollar':
      return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'coffee':
      return <svg {...p}><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>;
    case 'bus':
      return <svg {...p}><rect x="2" y="7" width="20" height="11" rx="2" ry="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M4 11h4v3H4zM16 11h4v3h-4zM2 13h20"/></svg>;
    case 'home':
      return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'zap':
      return <svg {...p}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/></svg>;
    case 'plus-cross':
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
    case 'film':
      return <svg {...p}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
    case 'shopping-bag':
      return <svg {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
    case 'book':
      return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
    case 'repeat':
      return <svg {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case 'gamepad':
      return <svg {...p}><rect x="2" y="6" width="20" height="12" rx="3"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>;
    case 'dumbbell':
      return <svg {...p}><path d="M6 5v14M18 5v14"/><rect x="2" y="8" width="4" height="8" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/><line x1="6" y1="12" x2="18" y2="12"/></svg>;
    case 'music':
      return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'camera':
      return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'sun':
      return <svg {...p}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
    case 'car':
      return <svg {...p}><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="15" cy="17" r="2"/></svg>;
    case 'heart':
      return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'scissors':
      return <svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
    case 'star':
      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'plane':
      return <svg {...p}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>;
    case 'pill':
      return <svg {...p}><path d="M10.5 20.5a6 6 0 1 0-8.5-8.5"/><path d="M15.5 3.5a6 6 0 0 1 5 9.46"/><line x1="3.5" y1="13.5" x2="13.5" y2="3.5"/></svg>;
    case 'phone':
      return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11 19.79 19.79 0 0 1 1.61 2.37 2 2 0 0 1 3.6.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 5.55 5.55l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 14.92z"/></svg>;
    default:
      return <svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
  }
}

function CategoryIcon({ category, emoji }: { category: string; emoji?: string }) {
  const baseClass = "h-5 w-5 text-accent drop-shadow-[0_0_4px_rgba(0,224,122,0.4)]";

  // ── Custom SVG icon key (stored as __svg:key) ─────────────────────
  if (emoji?.startsWith('__svg:')) {
    return <>{renderSvgByKey(emoji.slice(6), baseClass)}</>;
  }

  const cat = category.toLowerCase();
  const emo = emoji || "";

  // 1. Briefcase (Salary, Work, 💼)
  if (cat === 'salary' || emo === '💼' || cat.includes('salary') || cat.includes('work') || cat.includes('job')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }

  // 2. Laptop (Freelance, Code, Tech, 💻)
  if (cat === 'freelance' || emo === '💻' || cat.includes('freelance') || cat.includes('code') || cat.includes('tech') || cat.includes('dev')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="2" y1="20" x2="22" y2="20" />
        <line x1="12" y1="17" x2="12" y2="20" />
      </svg>
    );
  }

  // 3. Investment / Analytics / Charts (Investment, 📈, 📉, 📊)
  if (cat === 'investment' || emo === '📈' || emo === '📉' || emo === '📊' || cat.includes('invest') || cat.includes('stock') || cat.includes('crypto')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }

  // 4. Gift (Gift, 🎁)
  if (cat === 'gift' || emo === '🎁' || cat.includes('gift') || cat.includes('present')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="3" y="8" width="18" height="14" rx="2" />
        <path d="M12 5a3 3 0 1 0-3-3m3 3a3 3 0 1 1 3-3" />
        <line x1="12" y1="8" x2="12" y2="22" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    );
  }

  // 5. Refund (Refund, ↩️, 🔄, ◀️)
  if (cat === 'refund' || emo === '↩️' || emo === '🔄' || cat.includes('refund') || cat.includes('return')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
      </svg>
    );
  }

  // 6. Coins / Money / Other Income (Other Income, 💰, 💵, 🪙)
  if (cat === 'other_income' || emo === '💰' || emo === '💵' || emo === '🪙' || cat.includes('income') || cat.includes('cash') || cat.includes('money')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }

  // 7. Food / Coffee (Food, 🍔, ☕, 🍕, 🍩, 🍟)
  if (cat === 'food' || emo === '🍔' || emo === '☕' || emo === '🍕' || emo === '🍩' || emo === '🍟' || cat.includes('food') || cat.includes('coffee') || cat.includes('cafe') || cat.includes('restaurant') || cat.includes('eat') || cat.includes('drink') || cat.includes('grocer')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    );
  }

  // 8. Transport (Transport, 🚌, 🚗, 🚲, 🚇, ✈️)
  if (cat === 'transport' || emo === '🚌' || emo === '🚗' || emo === '🚲' || emo === '🚇' || emo === '✈️' || cat.includes('transport') || cat.includes('car') || cat.includes('bus') || cat.includes('taxi') || cat.includes('travel') || cat.includes('flight') || cat.includes('drive')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="2" y="7" width="20" height="11" rx="2" ry="2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M4 11h4v3H4zM16 11h4v3h-4zM2 13h20" />
      </svg>
    );
  }

  // 9. Housing (Housing, Rent, 🏠, 🏢, 🛌)
  if (cat === 'housing' || emo === '🏠' || emo === '🏢' || emo === '🛌' || cat.includes('housing') || cat.includes('rent') || cat.includes('home') || cat.includes('house') || cat.includes('room') || cat.includes('apartment')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }

  // 10. Utilities (Utilities, Light, Power, Water, 💡, 🔌, 💧)
  if (cat === 'utilities' || emo === '💡' || emo === '🔌' || emo === '💧' || cat.includes('utility') || cat.includes('light') || cat.includes('power') || cat.includes('water') || cat.includes('gas') || cat.includes('electricity')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5" />
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="10" y1="22" x2="14" y2="22" />
      </svg>
    );
  }

  // 11. Healthcare / Medical (Healthcare, Health, 🏥, 💊, 🩺, 💉, ❤️, 🩹)
  if (cat === 'healthcare' || emo === '🏥' || emo === '💊' || emo === '🩺' || emo === '❤️' || emo === '🩹' || cat.includes('health') || cat.includes('medical') || cat.includes('doctor') || cat.includes('hospital') || cat.includes('care') || cat.includes('pharmacy')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }

  // 12. Entertainment / Fun / Tickets (Entertainment, Fun, 🎬, 🎟️, 🍿, 🎮, 🎤, 🎧)
  if (cat === 'entertainment' || emo === '🎬' || emo === '🎟️' || emo === '🍿' || emo === '🎤' || emo === '🎧' || cat.includes('entertainment') || cat.includes('fun') || cat.includes('movie') || cat.includes('show') || cat.includes('concert') || cat.includes('ticket') || cat.includes('party')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="17" x2="22" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
      </svg>
    );
  }

  // 13. Shopping / Bag (Shopping, 🛍️, 🛒, 🏷️)
  if (cat === 'shopping' || emo === '🛍️' || emo === '🛒' || emo === '🏷️' || cat.includes('shopping') || cat.includes('buy') || cat.includes('purchase') || cat.includes('store') || cat.includes('amazon')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }

  // 14. Education / Studies / Books (Education, School, Study, 📚, 🎓, 🏫, 📝)
  if (cat === 'education' || emo === '📚' || emo === '🎓' || emo === '🏫' || emo === '📝' || cat.includes('education') || cat.includes('school') || cat.includes('study') || cat.includes('class') || cat.includes('book') || cat.includes('course') || cat.includes('learn')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }

  // 15. Subscriptions (Subscriptions, Recurring, 🔁, 🔄, 📅)
  if (cat === 'subscriptions' || emo === '🔁' || emo === '🔄' || emo === '📅' || cat.includes('sub') || cat.includes('recur') || cat.includes('bill') || cat.includes('member')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    );
  }

  // 16. Game / Console / Terminal / TEST (TEST, 👾, 🎮)
  if (cat === 'test' || emo === '👾' || emo === '🎮' || cat.includes('test') || cat.includes('game') || cat.includes('play')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="18" cy="12" r="1.5" />
      </svg>
    );
  }

  // 17. Other / Expense box / Default (📦, ⚙️, 🔧)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={baseClass}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function SyncDot({ status }: { status: LocalTransaction['syncStatus'] }) {
  const map = {
    synced:  { colour: 'bg-accent',  label: 'Synced'         },
    pending: { colour: 'bg-warning', label: 'Pending sync'   },
    deleted: { colour: 'bg-danger',  label: 'Pending delete' },
  } as const;

  const { colour, label } = map[status] ?? map.pending;

  return (
    <span
      title={label}
      aria-label={label}
      className="relative flex h-2 w-2 flex-shrink-0"
    >
      {status === 'pending' && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colour} opacity-60`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colour}`} />
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-surface-3" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded bg-surface-3" />
        <div className="h-2 w-20 rounded bg-surface-3" />
      </div>
      <div className="h-3.5 w-14 rounded bg-surface-3" />
    </div>
  );
}

// ─── Transaction row ───────────────────────────────────────────────────────────

interface TransactionRowProps {
  tx:        LocalTransaction;
  onDelete:  (tx: LocalTransaction) => void;
  isDeleting: boolean;
  categoryMeta?: { emoji: string; label: string };
}

function TransactionRow({ tx, onDelete, isDeleting, categoryMeta }: TransactionRowProps) {
  const meta     = categoryMeta ?? { emoji: '📦', label: 'Other' };
  const isIncome = tx.type === 'income';

  return (
    <li
      className={[
        'flex items-center justify-between gap-3 px-4 py-3.5 transition-all duration-200',
        isDeleting ? 'pointer-events-none opacity-30' : 'opacity-100',
      ].join(' ')}
    >
      {/* Left side: Category Icon + Description Title + Category Badge & Time */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 shadow-[0_0_10px_rgba(0,224,122,0.15)]"
          aria-hidden="true"
        >
          <CategoryIcon category={tx.category} emoji={meta.emoji} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-sm font-semibold text-content leading-snug">
            {tx.description?.trim() || meta.label}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-sans text-[0.62rem] font-bold text-muted/80 bg-surface-3/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {meta.label}
            </span>
            <span className="text-muted/40 text-[0.65rem] md:hidden">·</span>
            <span className="font-sans text-[0.65rem] text-muted md:hidden">
              {formatTime(tx.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Date & Time (desktop only) + Amount & Sync Status + Action Delete Button */}
      <div className="flex items-center gap-3.5 md:gap-8 flex-shrink-0">
        
        {/* Date & Time (Desktop only) */}
        <div className="hidden md:block text-left whitespace-nowrap min-w-[125px] flex-shrink-0">
          <p className="font-sans text-[0.7rem] text-content font-semibold leading-none">
            {formatDateFull(tx.date)}
          </p>
          <p className="font-sans text-[0.6rem] text-muted mt-1 leading-none">
            {formatTime(tx.date)}
          </p>
        </div>

        {/* Amount & Sync Status */}
        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 md:gap-1 text-right whitespace-nowrap min-w-[90px] md:min-w-[110px] flex-shrink-0 justify-end">
          <span
            className={[
              'font-mono text-sm font-semibold',
              isIncome ? 'text-accent' : 'text-content',
            ].join(' ')}
          >
            {isIncome ? '+ ' : '- '}{formatCurrency(tx.amount)}
          </span>
          <SyncDot status={tx.syncStatus} />
        </div>

        {/* Delete button (Unified responsive button with premium outline ring & hover effects) */}
        <button
          type="button"
          onClick={() => onDelete(tx)}
          disabled={isDeleting}
          aria-label={`Delete transaction: ${tx.description || meta.label}`}
          className={[
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border/60 bg-surface-3/30 cursor-pointer',
            'text-muted transition-all duration-150',
            'hover:border-danger/55 hover:bg-danger-dim/15 hover:text-danger hover:shadow-[0_0_8px_rgba(255,71,87,0.2)]',
            'outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
            'disabled:opacity-40',
            'active:scale-90',
          ].join(' ')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>

      </div>
      
    </li>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [query,        setQuery]        = useState('');
  const [typeFilter,   setTypeFilter]   = useState<'all' | 'income' | 'expense'>('all');
  const [deletingIds,  setDeletingIds]  = useState<Set<string>>(new Set());

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

  // ── Live query — all non-deleted records, newest first ───────────────────
  const transactions = useLiveQuery(
    async () => {
      const arr = await db.transactions
        .where('syncStatus')
        .notEqual('deleted')
        .sortBy('date');
      return arr.reverse();
    },
    [],
  );

  // ── Client-side filtering — runs in JS, no extra DB round-trip ──────────
  const filtered = useMemo(() => {
    if (!transactions) return [];

    const q = query.trim().toLowerCase();

    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (q) {
        const meta = categoryMap.get(tx.category) ?? { emoji: '📦', label: 'Other' };
        const inDescription = tx.description?.toLowerCase().includes(q) ?? false;
        const inCategory    = meta.label.toLowerCase().includes(q) ||
                              tx.category.toLowerCase().includes(q);
        if (!inDescription && !inCategory) return false;
      }

      return true;
    });
  }, [transactions, query, typeFilter, categoryMap]);

  // ── Derived totals for the filtered set ─────────────────────────────────
  const filteredIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const filteredExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // ── Date-grouped list ────────────────────────────────────────────────────
  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Delete handler ───────────────────────────────────────────────────────
  async function handleDelete(tx: LocalTransaction) {
    const meta = categoryMap.get(tx.category) ?? { emoji: '📦', label: 'Other' };
    const label = tx.description?.trim() || meta.label;

    const confirmed = window.confirm(
      `Delete "${label}" (${formatCurrency(tx.amount)})?\n\nThis will be removed from your local records and synced to the server automatically.`
    );
    if (!confirmed) return;

    setDeletingIds(prev => new Set(prev).add(tx.localId));

    try {
      await deleteTransaction(tx.localId);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(tx.localId);
        return next;
      });
      window.alert('Could not delete this transaction. Please try again.');
    }
  }

  return (
    <div className="min-h-dvh bg-surface pb-28 max-w-5xl mx-auto w-full md:px-4">

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-surface-2/70 backdrop-blur-xl">
        <div className="px-4 pb-3.5 pt-5">

          {/* Header row */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                aria-label="Back to dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-dim/10 text-accent transition-all duration-150 hover:border-accent hover:bg-accent-dim/20 hover:shadow-[0_0_10px_rgba(0,224,122,0.15)] active:scale-95 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Link>
              <div>
                <h1 className="font-sans text-base font-bold text-content leading-none">
                  Ledger History
                </h1>
                <p className="font-sans text-xs text-muted mt-1">
                  {transactions === undefined
                    ? 'Loading records…'
                    : `${transactions.length} total transaction${transactions.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <Link
              href="/add"
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-sans text-xs font-semibold text-surface shadow-[0_0_12px_rgba(0,224,122,0.35)] transition-all hover:brightness-110 active:scale-95 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                   aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              Add
            </Link>
          </div>

          {/* Search input */}
          <div className="relative mb-3.5">
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search descriptions or categories…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={[
                'w-full rounded-xl border border-border/40 bg-surface-3/30 py-2.5 pl-10 pr-4',
                'font-sans text-sm text-content placeholder:text-muted',
                'focus:border-accent/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 transition-colors backdrop-blur-md',
              ].join(' ')}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-content outline-none focus:outline-none focus-visible:text-content"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6"  y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-2">
            {(['all', 'income', 'expense'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                className={[
                  'rounded-full px-4 py-1.5 font-sans text-xs font-semibold transition-all duration-150 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                  typeFilter === f
                    ? f === 'income'
                      ? 'bg-accent/20 border border-accent/40 text-accent font-bold shadow-[0_0_8px_rgba(0,224,122,0.15)]'
                      : f === 'expense'
                      ? 'bg-danger/20 border border-danger/40 text-danger font-bold shadow-[0_0_8px_rgba(255,71,87,0.15)]'
                      : 'bg-accent border border-accent/25 text-surface font-bold shadow-md shadow-accent/25'
                    : 'bg-surface-3/20 border border-border/30 text-muted hover:text-content hover:border-border',
                ].join(' ')}
              >
                {f === 'all' ? 'All Flow' : f === 'income' ? '+ Income' : '− Expense'}
              </button>
            ))}
          </div>

        </div>

        {/* Filtered totals bar */}
        {(query || typeFilter !== 'all') && transactions !== undefined && (
          <div className="flex items-center gap-4 border-t border-border/30 bg-surface-2/30 px-4 py-2.5 backdrop-blur-md">
            <span className="font-sans text-[0.62rem] font-bold uppercase tracking-wider text-muted">
              {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
            </span>
            {typeFilter !== 'expense' && (
              <span className="font-mono text-xs font-bold text-accent">
                +{formatCurrency(filteredIncome)}
              </span>
            )}
            {typeFilter !== 'income' && (
              <span className="font-mono text-xs font-bold text-content">
                −{formatCurrency(filteredExpense)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <main className="px-0">

        {/* Loading skeletons */}
        {transactions === undefined && (
          <ul aria-busy="true" aria-label="Loading transactions" className="mt-2 divide-y divide-border/20">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </ul>
        )}

        {/* Empty — no records at all */}
        {transactions !== undefined && transactions.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
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
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </div>
            <p className="font-sans text-sm font-semibold text-content">No transactions yet</p>
            <p className="font-sans text-xs text-muted leading-relaxed">
              Tap the add button on the top right to log your first record!
            </p>
          </div>
        )}

        {/* Empty — records exist but search/filter returned nothing */}
        {transactions !== undefined && transactions.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="font-sans text-sm font-semibold text-content">No matches found</p>
            <p className="font-sans text-xs text-muted leading-relaxed">
              Try typing a different keyword or clear active filters.
            </p>
            <button
              type="button"
              onClick={() => { setQuery(''); setTypeFilter('all'); }}
              className="mt-2 rounded-full border border-accent/35 bg-accent-dim/10 px-5 py-2 font-sans text-xs font-semibold text-accent transition-all hover:bg-accent/15 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Grouped transaction list */}
        {groups.length > 0 && (
          <div className="mt-2">
            {groups.map(group => (
              <section key={group.dateKey} aria-label={group.label} className="mb-4">

                {/* Date section header */}
                <div className="flex items-center gap-3 px-4 py-2">
                  <span className="font-sans text-[0.65rem] font-bold uppercase tracking-widest text-muted">
                    {group.label}
                  </span>
                  <span className="flex-1 border-t border-border/30" />
                  <span className="font-sans text-[0.62rem] font-semibold text-muted/60 bg-surface-2/80 px-2 py-0.5 rounded-full border border-border/20">
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Rows for this date */}
                <div className="glass-panel overflow-hidden border-y border-border/35">
                  <ul className="divide-y divide-border/20">
                    {group.items.map(tx => (
                      <TransactionRow
                        key={tx.localId}
                        tx={tx}
                        onDelete={handleDelete}
                        isDeleting={deletingIds.has(tx.localId)}
                        categoryMeta={categoryMap.get(tx.category)}
                      />
                    ))}
                  </ul>
                </div>

              </section>
            ))}
          </div>
        )}

        {/* Bottom padding hint */}
        {filtered.length > 10 && (
          <p className="py-10 text-center font-sans text-[0.62rem] font-bold uppercase tracking-widest text-muted/30">
            • end of records •
          </p>
        )}

      </main>
    </div>
  );
}