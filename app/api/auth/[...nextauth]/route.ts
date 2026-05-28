// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"; // Imports from the auth.ts file you just made at the root

export const { GET, POST } = handlers;