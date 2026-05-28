// app/page.tsx
// This is a Server Component. It reads the session server-side and branches:
//   • Logged out → Landing page (fully server-rendered, zero client JS)
//   • Logged in  → Dashboard shell that mounts the Dexie Client Component

import { auth } from '@/auth';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    return <LandingPage />;
  }

  return <Dashboard user={session.user} />;
}