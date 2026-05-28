// types/next-auth.d.ts
// Augment the built-in Session type so TypeScript knows `session.user.id`
// exists. Without this, you get "Property 'id' does not exist" everywhere.
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}