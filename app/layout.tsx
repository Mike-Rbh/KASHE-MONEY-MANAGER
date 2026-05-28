import { ClientSyncEngine } from '@/components/ClientSyncEngine';
import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import SidebarNav from "@/components/SidebarNav";
import { auth } from '@/auth';
import "./globals.css";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kashe — Money Manager",
  description: "Offline-first personal finance tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kashe",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${dmMono.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-surface text-content antialiased">
        <ClientSyncEngine isAuthenticated={!!session} />
        <div className="relative flex min-h-dvh flex-col md:flex-row">
          {session && <SidebarNav session={session} />}
          <main className={`flex-1 overflow-y-auto ${session ? 'pb-nav md:pb-0 md:pl-64' : ''}`}>
            {children}
          </main>
          {session && <BottomNav />}
        </div>
      </body>
    </html>
  );
}
