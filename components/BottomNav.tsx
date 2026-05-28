// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ArrowsRightLeftIcon,
  PlusIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  ArrowsRightLeftIcon as TransferSolid,
  ChartBarIcon as ChartSolid,
  Cog6ToothIcon as CogSolid,
} from "@heroicons/react/24/solid";
import clsx from "clsx";

// ─────────────────────────────────────────────
// Nav items config
// ─────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
  /** If true, renders as a prominent center FAB instead of a tab */
  isFab?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: HomeIcon,
    activeIcon: HomeSolid,
  },
  {
    href: "/transactions",
    label: "Transfers", // Match "Transfers" from the design!
    icon: ArrowsRightLeftIcon,
    activeIcon: TransferSolid,
  },
  {
    href: "/add",
    label: "Add",
    icon: PlusIcon,   // unused for FAB; kept for type consistency
    activeIcon: PlusIcon,
    isFab: true,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: ChartBarIcon,
    activeIcon: ChartSolid,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Cog6ToothIcon,
    activeIcon: CogSolid,
  },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname();

  return (
    /*
     * fixed  — stays at the bottom of the viewport during scroll
     * safe-area — env(safe-area-inset-bottom) via Tailwind's pb-safe-*
     *             so the bar clears the iPhone home indicator
     */
    <nav
      aria-label="Main navigation"
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-border/40 bg-surface-2/70 backdrop-blur-xl",
        // Push content above the iOS home indicator
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          // ── Center FAB ────────────────────────────────
          if (item.isFab) {
            return (
              <li key={item.href} className="relative flex items-center justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className={clsx(
                    "flex h-14 w-14 -translate-y-3.5 items-center justify-center",
                    "rounded-full bg-accent text-surface shadow-[0_0_20px_rgba(0,224,122,0.45)] hover:shadow-[0_0_25px_rgba(0,224,122,0.6)]",
                    "border border-accent/20 transition-all duration-200",
                    "active:scale-90 hover:brightness-110",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2",
                  )}
                >
                  <PlusIcon className="h-6 w-6 text-black stroke-[3px]" />
                </Link>
              </li>
            );
          }

          // ── Regular tab ───────────────────────────────
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "group relative flex flex-col items-center gap-0.5 py-2",
                  "transition-colors duration-150",
                  "focus-visible:outline-none",
                )}
              >
                {/* Active glowing indicator dot/line */}
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute -top-px h-1 w-5 rounded-full bg-accent shadow-[0_0_8px_rgba(0,224,122,0.8)]",
                    "transition-all duration-300",
                    isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
                  )}
                />

                {/* Icon */}
                <Icon
                  className={clsx(
                    "h-[22px] w-[22px] transition-colors duration-150",
                    isActive
                      ? "text-accent"
                      : "text-muted group-hover:text-content",
                  )}
                />

                {/* Label */}
                <span
                  className={clsx(
                    "font-sans text-[0.6rem] font-medium leading-none tracking-wide",
                    "transition-colors duration-150",
                    isActive ? "text-accent" : "text-muted group-hover:text-content",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}



