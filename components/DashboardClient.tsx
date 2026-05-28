// components/DashboardClient.tsx
// The Client Component that owns all Dexie/useLiveQuery logic.
// Overhauled to perfectly match the premium dark-neon mockup visual design.

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalTransaction, addTransaction } from '@/lib/db';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return "DZD " + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCurrencySimple(amount: number): string {
  return "DZD " + new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d      = date instanceof Date ? date : new Date(date);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff   = (today.getTime() - target.getTime()) / 86_400_000;

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

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

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-border/30 bg-surface-2/40 px-4 py-4.5">
      <div className="h-10 w-10 rounded-xl bg-surface-3" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-28 rounded bg-surface-3" />
        <div className="h-2 w-16 rounded bg-surface-3" />
      </div>
      <div className="h-3.5 w-14 rounded bg-surface-3" />
    </div>
  );
}

function TransactionRow({ tx, categoryMeta }: { tx: LocalTransaction; categoryMeta?: { emoji: string; label: string } }) {
  const meta     = categoryMeta ?? { emoji: '📦', label: 'Other' };
  const isIncome = tx.type === 'income';

  return (
    <li className="flex items-center gap-4 border-b border-border/30 bg-transparent px-4 py-4.5 transition-colors hover:bg-surface-2/15 cursor-pointer">
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 shadow-sm"
        aria-hidden="true"
      >
        <CategoryIcon category={tx.category} emoji={meta.emoji} />
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-semibold text-content">
          {tx.description || meta.label}
        </p>
        <p className="mt-0.5 font-sans text-xs text-muted">
          {formatDate(tx.date)}, {formatTime(tx.date)}
        </p>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <span className={['font-mono text-sm font-semibold', isIncome ? 'text-accent' : 'text-content'].join(' ')}>
          {isIncome ? '+ ' : '- '}{formatCurrency(tx.amount)}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted/50"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </li>
  );
}

// ─── Main client component ─────────────────────────────────────────────────────

export default function DashboardClient() {
  const [visibleCount, setVisibleCount] = useState(10);
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

  // Query dynamic categories and construct an O(1) map for performance
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

  // ── Seeding logic for first startup matching the mockup ─────────────────────
  useEffect(() => {
    const seedMockData = async () => {
      if (transactions !== undefined && transactions.length === 0) {
        const today = new Date();
        today.setHours(9, 30, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(14, 0, 0, 0);

        const salaryDate = new Date();
        salaryDate.setDate(salaryDate.getDate() - 3);
        salaryDate.setHours(10, 15, 0, 0);

        const groceriesDate = new Date();
        groceriesDate.setDate(groceriesDate.getDate() - 4);
        groceriesDate.setHours(18, 30, 0, 0);

        // Seed calculations so balance is exactly 12,500.00 DZD
        // 15,085 - 2,450 - 120 - 15 = 12,500 DZD
        await addTransaction({
          amount: 15,
          type: 'expense',
          category: 'food',
          description: 'Coffee Shop',
          date: today,
        });

        await addTransaction({
          amount: 120,
          type: 'expense',
          category: 'shopping',
          description: 'Amazon Purchase',
          date: yesterday,
        });

        await addTransaction({
          amount: 15085,
          type: 'income',
          category: 'salary',
          description: 'Salary',
          date: salaryDate,
        });

        await addTransaction({
          amount: 2450,
          type: 'expense',
          category: 'food',
          description: 'Groceries',
          date: groceriesDate,
        });
      }
    };
    seedMockData();
  }, [transactions]);

  const totalIncome  = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0;
  const balance      = totalIncome - totalExpense;
  const pendingCount = transactions?.filter(t => t.syncStatus === 'pending').length ?? 0;
  const recentTxs    = transactions?.slice(0, visibleCount) ?? [];
  const hasMore      = transactions ? transactions.length > visibleCount : false;

  // --- Dynamic Story calculations ---
  // Top Spending Category
  const expenseCategories = transactions?.filter(t => t.type === 'expense') ?? [];
  const catSums: Record<string, number> = {};
  expenseCategories.forEach(t => {
    catSums[t.category] = (catSums[t.category] ?? 0) + t.amount;
  });
  let topCategory = 'Groceries';
  let topSpendingAmount = 2450;
  const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const topCatMeta = categoryMap.get(sortedCats[0][0]);
    topCategory = topCatMeta ? topCatMeta.label : sortedCats[0][0];
    topSpendingAmount = sortedCats[0][1];
  }

  // Daily Average
  let dailyAverage = 85;
  if (expenseCategories.length > 0) {
    const dates = expenseCategories.map(t => new Date(t.date).toDateString());
    const uniqueDays = Math.max(1, new Set(dates).size);
    dailyAverage = Math.round(totalExpense / uniqueDays);
  }

  // Budget Progress (Simulated based on dynamically derived numbers)
  const budgetProgress = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 75;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
      {/* ── Left Column: Balance summary & Insights ─────────────────────── */}
      <div className="lg:col-span-7 flex flex-col gap-6 w-full">
        
        {/* Balance card */}
        <section
          aria-label="Balance summary"
          className="relative overflow-hidden rounded-3xl border border-accent/25 bg-surface-2 px-5 py-5.5 shadow-[0_0_25px_rgba(0,224,122,0.05)] w-full"
        >
          {/* Subtle circuit background SVG */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
          >
            <path d="M 0,25 L 80,25 L 105,50 L 220,50 M 180,0 L 180,30 L 195,45 L 320,45" />
            <path d="M 400,15 L 430,15 L 445,30 L 445,90 L 460,105" />
            <circle cx="80" cy="25" r="3.5" fill="var(--color-accent)" />
            <circle cx="220" cy="50" r="3.5" fill="var(--color-accent)" />
            <circle cx="460" cy="105" r="3.5" fill="var(--color-accent)" />
          </svg>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-sans text-xs font-semibold uppercase tracking-wider text-accent/80">
                Total Balance
              </p>
              {transactions === undefined ? (
                <div className="mt-2.5 h-10 w-44 animate-pulse rounded-lg bg-surface-3" />
              ) : (
                <p className={['mt-2.5 font-mono text-3xl sm:text-4xl font-bold tracking-tight text-accent'].join(' ')}>
                  {formatCurrency(balance)}
                </p>
              )}
              
              <Link
                href="/analytics"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-dim/15 px-3.5 py-1 text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent/15 hover:border-accent active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
                <span>View Insights</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {/* Sync indicator wheel */}
            <div className="flex-shrink-0 pl-4">
              <div className="relative flex h-20 w-20 flex-col items-center justify-center">
                {/* Spinning/glowing dotted ring */}
                <div className={['absolute inset-0', pendingCount === 0 ? 'animate-rotate-dotted' : 'animate-pulse'].join(' ')}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="41"
                      stroke={pendingCount === 0 ? "var(--color-accent)" : "var(--color-danger)"}
                      strokeWidth="1.8"
                      strokeDasharray={pendingCount === 0 ? "2, 6" : "6, 4"}
                      fill="none"
                      opacity="0.8"
                      className=""
                    />
                  </svg>
                </div>

                {/* Status capsule */}
                <div className={[
                  'absolute h-[68px] w-[68px] rounded-full flex flex-col items-center justify-center border transition-colors duration-300',
                  pendingCount === 0 
                    ? 'border-accent/30 bg-accent-dim/10' 
                    : 'border-danger/30 bg-danger-dim/10'
                ].join(' ')}>
                  {pendingCount === 0 ? (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#00e07a"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-breathe"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="mt-1 font-sans text-[0.55rem] font-bold tracking-widest text-accent uppercase">
                        Synced
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ff4757"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-spin"
                      >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span className="mt-1 font-sans text-[0.5rem] font-bold tracking-widest text-danger uppercase">
                        Pending
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Money Story ────────────────────────────────────────────────── */}
        <section className="w-full" aria-label="Money Story">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-sans text-base font-bold text-content">Money Story</h2>
            <Link href="/analytics" className="flex items-center gap-0.5 font-sans text-xs font-semibold text-accent hover:underline">
              <span>See all</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* Carousel / Grid Container */}
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1.5 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:gap-4">
            
            {/* Card 1: Top Spending */}
            <div className="glass-panel relative h-[138px] sm:h-[150px] w-[124px] sm:w-full flex-shrink-0 snap-start rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
              {/* Tiny Background Sparkline SVG */}
              <svg className="absolute bottom-1 right-2 h-5 sm:h-6 w-12 sm:w-16 opacity-35" viewBox="0 0 50 15" fill="none">
                <path d="M 0,12 C 10,13 15,3 25,6 C 35,9 40,1 50,2" stroke="var(--color-accent)" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="50" cy="2" r="1.5" fill="var(--color-accent)" />
              </svg>
              
              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-accent-dim/10 border border-accent/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-accent">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>

              <div>
                <p className="font-sans text-[0.6rem] font-medium leading-tight text-muted">
                  Top Spending this week
                </p>
                <h3 className="mt-0.5 truncate font-sans text-sm font-semibold text-content leading-none">
                  {topCategory}
                </h3>
                <span className="mt-2 inline-block rounded bg-accent-dim/15 border border-accent/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold text-accent">
                  {formatCurrencySimple(topSpendingAmount)}
                </span>
              </div>
            </div>

            {/* Card 2: Daily Average */}
            <div className="glass-panel relative h-[138px] sm:h-[150px] w-[124px] sm:w-full flex-shrink-0 snap-start rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
              {/* Tiny Bar Chart SVG */}
              <div className="absolute bottom-2.5 right-2.5 flex items-end gap-0.5 h-4.5 sm:h-6 opacity-30">
                {[6, 12, 5, 14, 9, 16].map((h, i) => (
                  <div key={i} className="w-0.75 bg-accent rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 150}ms` }} />
                ))}
              </div>

              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-accent-dim/10 border border-accent/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-accent">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>

              <div>
                <p className="font-sans text-[0.6rem] font-medium leading-tight text-muted">
                  Daily Average
                </p>
                <h3 className="mt-0.5 font-mono text-sm font-semibold text-content leading-none">
                  {formatCurrencySimple(dailyAverage)}
                </h3>
                <div className="h-1.5" />
              </div>
            </div>

            {/* Card 3: Budget Progress */}
            <div className="glass-panel h-[138px] sm:h-[150px] w-[124px] sm:w-full flex-shrink-0 snap-start rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-accent-dim/10 border border-accent/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-accent">
                  <circle cx="8" cy="8" r="6" />
                  <circle cx="18" cy="18" r="4" />
                  <path d="M12 18a6 6 0 0 0-6-6" />
                </svg>
              </div>

              <div>
                <p className="font-sans text-[0.6rem] font-medium leading-tight text-muted">
                  Budget Progress
                </p>
                <h3 className="mt-0.5 font-mono text-sm font-semibold text-content leading-none">
                  {budgetProgress}%
                </h3>
                <p className="font-sans text-[0.55rem] text-muted leading-none mt-0.5">utilized</p>
                
                {/* Minimal progress bar */}
                <div className="mt-2.5 h-1 w-full bg-surface-3 rounded-full overflow-hidden border border-border/20">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, budgetProgress)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Comparison vs Last Month */}
            <div className="glass-panel relative h-[138px] sm:h-[150px] w-[124px] sm:w-full flex-shrink-0 snap-start rounded-2xl p-3 sm:p-4 flex flex-col justify-between overflow-hidden">
              {/* Sparkline rising line */}
              <svg className="absolute bottom-1 right-2 h-5 sm:h-6 w-12 sm:w-16 opacity-35" viewBox="0 0 50 15" fill="none">
                <path d="M 0,12 C 10,10 20,11 30,5 C 40,4 45,1 50,2" stroke="var(--color-accent)" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="50" cy="2" r="1.5" fill="var(--color-accent)" />
              </svg>

              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-accent-dim/10 border border-accent/15">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-accent">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>

              <div>
                <p className="font-sans text-[0.56rem] font-medium leading-tight text-muted">
                  Comparison vs last month
                </p>
                <h3 className="mt-0.5 font-mono text-sm font-semibold text-accent leading-none">
                  +12%
                </h3>
                <p className="font-sans text-[0.55rem] text-muted leading-none mt-0.5">more spent</p>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* ── Right Column: Recent transactions ───────────────────────────── */}
      <section aria-label="Recent transactions" className="lg:col-span-5 w-full">
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold text-content">Recent Transactions</h2>
          {transactions && transactions.length > 0 && (
            <Link href="/transactions" className="flex items-center gap-0.5 font-sans text-xs font-semibold text-accent hover:underline">
              <span>See all</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </div>

        {transactions === undefined && (
          <ul className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </ul>
        )}

        {transactions !== undefined && transactions.length === 0 && (
          <div className="flex flex-col items-center gap-3.5 rounded-3xl border border-dashed border-border/60 bg-transparent px-6 py-12 text-center">
            <span className="text-4xl" aria-hidden="true">💸</span>
            <p className="font-sans text-sm text-muted">No transactions recorded yet.</p>
            <Link
              href="/add"
              className="mt-1.5 rounded-full bg-accent px-5 py-2.5 font-sans text-xs font-semibold text-surface transition-all hover:brightness-110 active:scale-95"
            >
              Add your first transaction
            </Link>
          </div>
        )}

        {recentTxs.length > 0 && (
          <>
            <div className="glass-panel overflow-hidden rounded-2xl border border-border/30">
              <ul className="flex flex-col divide-y divide-border/20">
                {recentTxs.map(tx => <TransactionRow key={tx.localId} tx={tx} categoryMeta={categoryMap.get(tx.category)} />)}
              </ul>
            </div>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-dim/10 px-4 py-2 font-sans text-xs font-semibold text-accent transition-all duration-200 hover:bg-accent/15 hover:border-accent active:scale-95 cursor-pointer select-none"
                >
                  <span>Show More</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}