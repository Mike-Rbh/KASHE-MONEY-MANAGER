// components/SidebarNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { db } from "@/lib/db";
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

interface SidebarNavProps {
  session: Session | null;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
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
    label: "Transfers",
    icon: ArrowsRightLeftIcon,
    activeIcon: TransferSolid,
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

export default function SidebarNav({ session }: SidebarNavProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    const confirmed = window.confirm("Sign out of your account? Your local offline records will be cleared.");
    if (!confirmed) return;

    try {
      await db.transactions.clear();
      localStorage.removeItem("lastSyncDate");
    } catch (err) {
      console.error("Failed to clear local database on sign out:", err);
    }
    await signOut({ callbackUrl: "/" });
  };

  const userName = session?.user?.name ?? "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      aria-label="Desktop Sidebar Navigation"
      className={clsx(
        "hidden md:flex flex-col justify-between fixed left-0 top-0 bottom-0 z-50 w-64",
        "border-r border-border/40 bg-surface-2/70 backdrop-blur-xl p-6",
      )}
    >
      <div className="flex flex-col gap-8">
        {/* Branding header */}
        <div className="flex items-center gap-3 select-none">
          <svg
            className="h-9 w-9 text-accent"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="7.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M25 20V80" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M75 20L42.5 50L75 80" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M35 50H50" />
            <circle cx="25" cy="20" r="4" fill="var(--color-accent)" />
            <circle cx="25" cy="80" r="4" fill="var(--color-accent)" />
            <circle cx="75" cy="20" r="4" fill="var(--color-accent)" />
            <circle cx="75" cy="80" r="4" fill="var(--color-accent)" />
          </svg>
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-lg font-extrabold tracking-wider uppercase text-content">
              kashe
            </span>
            <span className="rounded-full border border-accent/30 bg-accent-dim/10 px-2 py-0.5 font-sans text-[0.5rem] font-bold uppercase tracking-widest text-accent">
              beta
            </span>
          </div>
        </div>

        {/* CTA: Log Transaction */}
        <Link
          href="/add"
          className={clsx(
            "flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5",
            "font-sans text-xs font-bold uppercase tracking-wider text-surface shadow-sm",
            "transition-all duration-200 hover:brightness-110 active:scale-[0.97]",
            "outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
        >
          <PlusIcon className="h-4.5 w-4.5 text-black stroke-[3px]" />
          <span>New Transaction</span>
        </Link>

        {/* Main Navigation Links */}
        <nav aria-label="Sidebar main navigation">
          <ul className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = isActive ? item.activeIcon : item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3.5 rounded-xl px-4 py-3",
                      "transition-all duration-200",
                      "outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                      isActive
                        ? "bg-accent-dim/10 text-accent font-bold"
                        : "text-muted hover:text-content hover:bg-surface-3/30",
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent"
                      />
                    )}

                    <Icon
                      className={clsx(
                        "h-5 w-5 transition-colors duration-150",
                        isActive ? "text-accent drop-shadow-[0_0_4px_rgba(0,224,122,0.4)]" : "text-muted group-hover:text-content",
                      )}
                    />
                    <span className="font-sans text-xs font-semibold uppercase tracking-wider">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* User profile Welcome & Sign Out section */}
      <div className="flex flex-col gap-4 border-t border-border/30 pt-6">
        <div className="flex items-center gap-3">
          {/* Avatar circle */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-dim/15 border border-accent/25 font-sans text-xs font-bold text-accent shadow-sm">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[0.62rem] font-bold text-muted uppercase tracking-widest leading-none">
              Account
            </p>
            <p className="font-sans text-sm font-bold text-content mt-1 truncate">
              {userName}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className={clsx(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger-dim/10 px-4 py-2.5",
            "font-sans text-xs font-bold uppercase tracking-wider text-danger transition-all duration-200",
            "hover:border-danger hover:bg-danger-dim/20 active:scale-[0.97] cursor-pointer select-none",
            "outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
          )}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
