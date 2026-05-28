// app/add/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addTransaction, TransactionType, addCustomCategory, softDeleteCategory } from '@/lib/db';

function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── SVG Icon Registry ──────────────────────────────────────────────────────────

const SVG_ICON_KEYS = [
  'briefcase', 'laptop', 'bar-chart', 'gift', 'rotate-ccw', 'dollar',
  'coffee', 'bus', 'home', 'zap', 'plus-cross', 'film',
  'shopping-bag', 'book', 'repeat', 'gamepad',
  'dumbbell', 'music', 'camera', 'sun', 'car', 'heart', 'scissors', 'star',
  'plane', 'pill', 'phone',
] as const;

type SvgIconKey = (typeof SVG_ICON_KEYS)[number];

const SVG_ICON_LABELS: Record<SvgIconKey, string> = {
  'briefcase':    'Work',
  'laptop':       'Tech',
  'bar-chart':    'Finance',
  'gift':         'Gift',
  'rotate-ccw':   'Refund',
  'dollar':       'Money',
  'coffee':       'Food',
  'bus':          'Transit',
  'home':         'Home',
  'zap':          'Power',
  'plus-cross':   'Health',
  'film':         'Fun',
  'shopping-bag': 'Shop',
  'book':         'Study',
  'repeat':       'Sub',
  'gamepad':      'Game',
  'dumbbell':     'Gym',
  'music':        'Music',
  'camera':       'Photo',
  'sun':          'Travel',
  'car':          'Car',
  'heart':        'Charity',
  'scissors':     'Care',
  'star':         'Star',
  'plane':        'Flight',
  'pill':         'Meds',
  'phone':        'Phone',
};

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

// ─── Icon Picker Grid ────────────────────────────────────────────────────────────

function IconPickerGrid({ selected, onSelect }: { selected: string; onSelect: (val: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 max-h-44 overflow-y-auto rounded-xl pr-0.5">
      {SVG_ICON_KEYS.map(key => {
        const val = `__svg:${key}`;
        const isActive = selected === val;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(val)}
            title={SVG_ICON_LABELS[key]}
            className={[
              'group flex flex-col items-center justify-center gap-1 rounded-xl p-2 border transition-all duration-150 cursor-pointer select-none',
              isActive
                ? 'border-accent bg-accent/15 text-accent shadow-[0_0_6px_rgba(0,224,122,0.2)]'
                : 'border-border/30 bg-surface-3/30 text-muted hover:border-content/30 hover:text-content',
            ].join(' ')}
          >
            {renderSvgByKey(key, isActive ? 'h-5 w-5 text-accent' : 'h-5 w-5 text-muted group-hover:text-content transition-colors')}
            <span className="font-sans text-[0.46rem] uppercase tracking-wide truncate w-full text-center leading-none">
              {SVG_ICON_LABELS[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── SVG Category Icons Helper ──────────────────────────────────────────────────

function CategoryIcon({ category, emoji, active }: { category: string; emoji?: string; active: boolean }) {
  const baseClass = active
    ? 'h-6 w-6 text-accent drop-shadow-[0_0_4px_rgba(0,224,122,0.4)]'
    : 'h-6 w-6 text-muted group-hover:text-content transition-colors';

  // ── Custom SVG icon key (stored as __svg:key) ─────────────────────
  if (emoji?.startsWith('__svg:')) {
    return <>{renderSvgByKey(emoji.slice(6), baseClass)}</>;
  }

  const cat = category.toLowerCase();
  const emo = emoji || '';

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

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AddTransactionPage() {
    const router = useRouter();

    // Core transaction logging state
    const [type, setType] = useState<TransactionType>('expense');
    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [date, setDate] = useState<string>(todayISO());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Grid states: delete mode and modal states
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [showDefinitiveModal, setShowDefinitiveModal] = useState(false);
    const [showOneTimeModal, setShowOneTimeModal] = useState(false);

    // Forms inside modals — default icon key instead of emoji
    const [newCategoryLabel, setNewCategoryLabel] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('__svg:star');
    const [modalError, setModalError] = useState<string | null>(null);

    // Live Query for dynamic categories
    const allCategories = useLiveQuery(() => db.categories.toArray());

    function handleTypeChange(next: TransactionType) {
        setType(next);
        setCategory('');
        setIsDeleteMode(false);
    }

    // Filter categories that match flow type and are active (not deleted)
    // We also exclude the standard other_expense and other_income from standard list
    // because we handle 'Other' as a custom one-time category trigger!
    const visibleCategories = (allCategories || []).filter(c =>
        c.type === type &&
        c.deletedAt === undefined &&
        c.id !== 'other_expense' &&
        c.id !== 'other_income'
    );

    // Check if the currently selected category is a custom one-time category (saved immediately soft-deleted)
    const isSelectedOt = category.startsWith('cat_ot_');
    const otCategoryMeta = isSelectedOt ? allCategories?.find(c => c.id === category) : null;

    // Helper: definitive category modal actions
    function openDefinitiveModal() {
        setNewCategoryIcon('__svg:star');
        setNewCategoryLabel('');
        setModalError(null);
        setShowDefinitiveModal(true);
    }

    async function handleCreateDefinitiveCategory() {
        setModalError(null);
        const label = newCategoryLabel.trim();
        const icon  = newCategoryIcon.trim();

        if (!label) {
            setModalError('Please enter a category name.');
            return;
        }

        try {
            const newCat = await addCustomCategory(label, icon, type, false);
            setCategory(newCat.id);
            setShowDefinitiveModal(false);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to create category.');
        }
    }

    // Helper: one-time category modal actions
    async function handleCreateOneTimeCategory() {
        setModalError(null);
        const label = newCategoryLabel.trim();
        const icon  = newCategoryIcon.trim();

        if (!label) {
            setModalError('Please enter a category name.');
            return;
        }

        try {
            const newCat = await addCustomCategory(label, icon, type, true); // true = one-time
            setCategory(newCat.id);
            setShowOneTimeModal(false);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Failed to create category.');
        }
    }

    // Helper: soft-deleting a dynamic category
    async function handleDeleteCategory(e: React.MouseEvent, id: string, label: string) {
        e.stopPropagation(); // prevent selecting it while clicking delete
        const confirmed = window.confirm(`Delete category "${label}"? Existing transactions using this category will still display it properly.`);
        if (!confirmed) return;

        try {
            await softDeleteCategory(id);
            if (category === id) {
                setCategory('');
            }
        } catch (err) {
            console.error('Failed to soft delete category:', err);
            window.alert('Could not delete category. Please try again.');
        }
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        const parsedAmount = parseFloat(amount);

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Please enter a valid amount greater than zero.');
            return;
        }
        if (!category) {
            setError('Please select a category.');
            return;
        }
        if (!date) {
            setError('Please pick a date.');
            return;
        }

        setIsSubmitting(true);

        try {
            await addTransaction({
                amount: parsedAmount,
                type,
                category,
                description: description.trim() || undefined,
                date: new Date(`${date}T00:00:00`),
            });

            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
            setIsSubmitting(false);
        }
    }

    return (
        <div className="min-h-dvh bg-surface px-4 pb-28 pt-6 md:pt-8 md:pb-8 max-w-5xl mx-auto w-full relative">

            {/* ── Page header ───────────────────────────────────────────────────── */}
            <header className="mb-6 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    aria-label="Go back"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-dim/10 text-accent transition-all duration-150 hover:border-accent hover:bg-accent-dim/20 hover:shadow-[0_0_10px_rgba(0,224,122,0.15)] active:scale-95 cursor-pointer"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className="font-sans text-base font-bold text-content leading-none">
                    Log Transaction
                </h1>
            </header>

            <form onSubmit={handleSubmit} noValidate className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start w-full">
                    
                    {/* Left Column: Transaction Details */}
                    <div className="flex flex-col gap-6.5 w-full">
                        {/* ── Type toggle ────────────────────────────────────────────────── */}
                        <fieldset>
                            <legend className="mb-2.5 font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                Transaction Flow
                            </legend>
                            <div className="flex rounded-2xl border border-border/30 bg-surface-3/30 p-1.5 backdrop-blur-md">
                                {(['expense', 'income'] as TransactionType[]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => handleTypeChange(t)}
                                        className={[
                                            'flex-1 rounded-xl py-2.5 font-sans text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer',
                                            type === t
                                                ? t === 'expense'
                                                    ? 'bg-danger text-surface font-black shadow-md shadow-danger/25'
                                                    : 'bg-accent text-surface font-black shadow-md shadow-accent/25'
                                                : 'text-muted hover:text-content',
                                        ].join(' ')}
                                    >
                                        {t === 'expense' ? '− Expense' : '+ Income'}
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        {/* ── Amount ─────────────────────────────────────────────────────── */}
                        <fieldset>
                            <legend className="mb-2.5 font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                Amount
                            </legend>
                            <div className="relative flex items-center rounded-2xl border border-border/40 bg-surface-2 focus-within:border-accent/60 transition-all overflow-hidden">
                                <div className="flex items-center justify-center border-r border-border/40 bg-surface-3/25 px-4 py-3.5 select-none">
                                    <span className="font-sans text-xs font-bold tracking-widest text-muted/80">
                                        DZD
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    min="0.01"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    className={[
                                        'flex-1 bg-transparent py-3.5 pl-3.5 pr-4 font-mono text-2xl font-bold text-accent',
                                        'placeholder:text-muted/30 focus:outline-none',
                                        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                                    ].join(' ')}
                                />
                            </div>
                        </fieldset>

                        {/* ── Date ───────────────────────────────────────────────────────── */}
                        <fieldset>
                            <legend className="mb-2.5 font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                Transaction Date
                            </legend>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                max={todayISO()}
                                required
                                className={[
                                    'w-full rounded-2xl border border-border/40 bg-surface-2 px-4.5 py-3.5',
                                    'font-mono text-sm text-content',
                                    'focus:border-accent/60 focus:outline-none transition-all',
                                    '[color-scheme:dark]',
                                ].join(' ')}
                            />
                        </fieldset>

                        {/* ── Description ────────────────────────────────────────────────── */}
                        <fieldset>
                            <legend className="mb-2.5 font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                <span>Description </span>
                                <span className="ml-1.5 normal-case font-medium text-muted/50">
                                    (optional)
                                </span>
                            </legend>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={2}
                                maxLength={255}
                                placeholder="What was this transaction for?"
                                className={[
                                    'w-full resize-none rounded-2xl border border-border/40 bg-surface-2',
                                    'px-4.5 py-3.5 font-sans text-sm text-content placeholder:text-muted/40',
                                    'focus:border-accent/60 focus:outline-none transition-all',
                                ].join(' ')}
                            />
                        </fieldset>

                        {/* ── Validation error ───────────────────────────────────────────── */}
                        {error && (
                            <p role="alert" className="rounded-2xl border border-danger/25 bg-danger-dim/15 px-4.5 py-3.5 font-sans text-xs font-semibold text-danger animate-breathe shadow-sm">
                                {error}
                            </p>
                        )}

                        {/* ── Submit ─────────────────────────────────────────────────────── */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={[
                                'w-full rounded-2xl py-4 font-sans text-sm font-bold uppercase tracking-wider cursor-pointer select-none',
                                'transition-all duration-200',
                                type === 'income'
                                    ? 'bg-accent text-surface shadow-lg shadow-accent/25'
                                    : 'bg-danger text-surface shadow-lg shadow-danger/25',
                                'hover:brightness-110 active:scale-[0.97]',
                                'disabled:cursor-not-allowed disabled:opacity-50',
                            ].join(' ')}
                        >
                            {isSubmitting ? 'Saving Transaction…' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
                        </button>
                    </div>

                    {/* Right Column: Category Selection Grid */}
                    <div className="w-full">
                        {/* ── Category grid ──────────────────────────────────────────────── */}
                        <fieldset>
                            <div className="mb-2.5 flex items-center justify-between">
                                <legend className="font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                    Select Category
                                </legend>
                                
                                {/* Header controls for creating/deleting definitive categories */}
                                <div className="flex items-center gap-1.5">
                                    {/* Definitive category adder */}
                                    <button
                                        type="button"
                                        onClick={openDefinitiveModal}
                                        aria-label="Add custom category"
                                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-accent/25 bg-accent-dim/10 text-accent hover:bg-accent hover:text-surface transition-all active:scale-90 cursor-pointer"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>

                                    {/* Delete mode toggler */}
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteMode(prev => !prev)}
                                        aria-label="Delete categories toggle"
                                        className={[
                                            'flex h-7.5 w-7.5 items-center justify-center rounded-lg border transition-all active:scale-90 cursor-pointer',
                                            isDeleteMode
                                                ? 'border-danger bg-danger text-surface shadow-[0_0_8px_rgba(255,71,87,0.25)]'
                                                : 'border-border/30 bg-surface-3/30 text-muted hover:text-danger hover:border-danger/30'
                                        ].join(' ')}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {/* Dynamically list standard & definitive custom categories */}
                                {visibleCategories.map(cat => {
                                    const isSelected = category === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => !isDeleteMode && setCategory(cat.id)}
                                            disabled={isDeleteMode && !cat.isCustom}
                                            className={[
                                                'group relative flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all duration-200 cursor-pointer',
                                                isSelected
                                                    ? 'border-accent bg-accent-dim/15 text-accent shadow-[0_0_12px_rgba(0,224,122,0.15)] font-bold'
                                                    : 'border-border/30 bg-surface-2/40 text-muted hover:border-content/30 hover:text-content hover:bg-surface-2/65',
                                                isDeleteMode && cat.isCustom ? 'hover:border-danger/40' : '',
                                                isDeleteMode && !cat.isCustom ? 'opacity-30 cursor-not-allowed' : ''
                                            ].join(' ')}
                                        >
                                            {/* Custom category badge — small ✦ star in top-left corner */}
                                            {cat.isCustom && (
                                                <span
                                                    className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface border border-accent/50 text-accent shadow-[0_0_4px_rgba(0,224,122,0.3)] z-10"
                                                    aria-label="Custom category"
                                                    title="Custom category"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="h-2 w-2">
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                                    </svg>
                                                </span>
                                            )}
                                            <div className={[
                                                'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                                                isSelected ? 'bg-accent/10 border border-accent/20' : 'bg-surface-3/30 border border-border/20'
                                            ].join(' ')}>
                                                <CategoryIcon category={cat.id} emoji={cat.emoji} active={isSelected} />
                                            </div>
                                            <span className="font-sans text-[0.62rem] font-semibold uppercase tracking-wider leading-none mt-1 truncate max-w-full px-1">
                                                {cat.label}
                                            </span>

                                            {/* Delete overlay minus badge for dynamic categories */}
                                            {isDeleteMode && cat.isCustom && (
                                                <span
                                                    role="button"
                                                    onClick={(e) => handleDeleteCategory(e, cat.id, cat.label)}
                                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-surface font-black shadow-[0_0_5px_rgba(255,71,87,0.4)] hover:scale-110 active:scale-90 transition-all cursor-pointer z-10 select-none"
                                                    aria-label={`Delete ${cat.label}`}
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}

                                {/* Special interactive "Other" category button for one-time category creations */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isDeleteMode) return;
                                        setNewCategoryIcon('__svg:star');
                                        setNewCategoryLabel('');
                                        setModalError(null);
                                        setShowOneTimeModal(true);
                                    }}
                                    disabled={isDeleteMode}
                                    className={[
                                        'group flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all duration-200 cursor-pointer',
                                        isSelectedOt
                                            ? 'border-accent bg-accent-dim/15 text-accent shadow-[0_0_12px_rgba(0,224,122,0.15)] font-bold'
                                            : 'border-border/30 bg-surface-2/40 text-muted hover:border-content/30 hover:text-content hover:bg-surface-2/65',
                                        isDeleteMode ? 'opacity-30 cursor-not-allowed' : ''
                                    ].join(' ')}
                                >
                                    <div className={[
                                        'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                                        isSelectedOt ? 'bg-accent/10 border border-accent/20' : 'bg-surface-3/30 border border-border/20'
                                    ].join(' ')}>
                                        {isSelectedOt && otCategoryMeta ? (
                                            <CategoryIcon category={otCategoryMeta.id} emoji={otCategoryMeta.emoji} active={true} />
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isSelectedOt ? 'h-6 w-6 text-accent drop-shadow-[0_0_4px_rgba(0,224,122,0.4)]' : 'h-6 w-6 text-muted group-hover:text-content transition-colors'}>
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="16" />
                                                <line x1="8" y1="12" x2="16" y2="12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="font-sans text-[0.62rem] font-semibold uppercase tracking-wider leading-none mt-1 truncate max-w-full px-1">
                                        {isSelectedOt && otCategoryMeta ? `Other: ${otCategoryMeta.label}` : 'Other'}
                                    </span>
                                </button>
                            </div>
                        </fieldset>
                    </div>

                </div>
            </form>

            {/* ── Definitive Category Creation Modal (Glassmorphic) ────────────────────────── */}
            {showDefinitiveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 px-4 backdrop-blur-md transition-all duration-300">
                    <div className="w-full max-w-sm rounded-3xl border border-accent/20 bg-surface-2/90 p-6 shadow-[0_0_40px_rgba(0,224,122,0.15)] backdrop-blur-xl animate-scale-up">
                        <h3 className="font-sans text-base font-black text-content mb-4 tracking-wide">
                            Create Permanent Category
                        </h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                    Choose Icon
                                </label>
                                <IconPickerGrid selected={newCategoryIcon} onSelect={setNewCategoryIcon} />
                            </div>
                            <div>
                                <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Gym"
                                    value={newCategoryLabel}
                                    onChange={e => setNewCategoryLabel(e.target.value)}
                                    maxLength={20}
                                    className="w-full rounded-2xl border border-border/40 bg-surface-3/50 px-4.5 py-3.5 font-sans text-sm text-content placeholder:text-muted/40 focus:border-accent/60 focus:outline-none transition-all"
                                />
                            </div>
                            {modalError && (
                                <p className="font-sans text-xs font-semibold text-danger bg-danger-dim/10 border border-danger/10 px-3 py-2 rounded-xl animate-pulse">
                                    {modalError}
                                </p>
                            )}
                            <div className="flex gap-3 mt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDefinitiveModal(false)}
                                    className="flex-1 rounded-2xl border border-border/50 bg-transparent py-3.5 font-sans text-xs font-bold uppercase tracking-wider text-muted transition-all hover:text-content hover:bg-surface-3/40 active:scale-95 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateDefinitiveCategory}
                                    className="flex-1 rounded-2xl bg-accent py-3.5 font-sans text-xs font-bold uppercase tracking-wider text-surface shadow-md shadow-accent/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── One-Time Category Creation Modal (Glassmorphic) ────────────────────────── */}
            {showOneTimeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 px-4 backdrop-blur-md transition-all duration-300">
                    <div className="w-full max-w-sm rounded-3xl border border-danger/20 bg-surface-2/90 p-6 shadow-[0_0_40px_rgba(255,71,87,0.15)] backdrop-blur-xl animate-scale-up">
                        <h3 className="font-sans text-base font-black text-content mb-2.5 tracking-wide">
                            One-Time Category
                        </h3>
                        <p className="font-sans text-[0.7rem] text-muted leading-relaxed mb-4">
                            This category will be logged for <strong>this transaction only</strong> and will not clutter your category selection grid in the future.
                        </p>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                    Choose Icon
                                </label>
                                <IconPickerGrid selected={newCategoryIcon} onSelect={setNewCategoryIcon} />
                            </div>
                            <div>
                                <label className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Boss Dinner"
                                    value={newCategoryLabel}
                                    onChange={e => setNewCategoryLabel(e.target.value)}
                                    maxLength={20}
                                    className="w-full rounded-2xl border border-border/40 bg-surface-3/50 px-4.5 py-3.5 font-sans text-sm text-content placeholder:text-muted/40 focus:border-danger/60 focus:outline-none transition-all"
                                />
                            </div>
                            {modalError && (
                                <p className="font-sans text-xs font-semibold text-danger bg-danger-dim/10 border border-danger/10 px-3 py-2 rounded-xl animate-pulse">
                                    {modalError}
                                </p>
                            )}
                            <div className="flex gap-3 mt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOneTimeModal(false)}
                                    className="flex-1 rounded-2xl border border-border/50 bg-transparent py-3.5 font-sans text-xs font-bold uppercase tracking-wider text-muted transition-all hover:text-content hover:bg-surface-3/40 active:scale-95 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateOneTimeCategory}
                                    className="flex-1 rounded-2xl bg-danger py-3.5 font-sans text-xs font-bold uppercase tracking-wider text-surface shadow-md shadow-danger/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                >
                                    Use Category
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}