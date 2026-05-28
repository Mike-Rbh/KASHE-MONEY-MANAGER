// auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],

  // Auth.js v5 with the Prisma adapter defaults to the "database" session
  // strategy, which stores sessions in the Session table. This is what you
  // want — the JWT strategy would discard the adapter's session management.
  session: {
    strategy: 'database',
  },

  callbacks: {
    // The `session` callback runs every time `auth()` / `getServerSession()`
    // is called. The Prisma adapter populates `session.user` from the DB, but
    // the `id` field is NOT included by default — we add it here so Server
    // Actions and Server Components can use it directly without an extra query.
    async session({ session, user }: { session: any; user: any }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  pages: {
    // Redirect unauthenticated users to the home page (which renders the
    // landing page) rather than the default Auth.js /auth/signin route.
    signIn: '/',
  },
});