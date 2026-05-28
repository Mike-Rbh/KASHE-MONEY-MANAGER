import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Check for the presence of the NextAuth/Auth.js session cookie.
  // We check both HTTP (dev) and HTTPS (prod/secure) cookie name variants.
  const sessionToken =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isTargetingPublic = req.nextUrl.pathname === "/";

  // If unauthenticated and trying to access any page other than "/",
  // redirect them back to the landing page ("/") immediately.
  if (!isLoggedIn && !isTargetingPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

// Matcher to protect all pages, excluding static resources, APIs, and PWA assets
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"
  ],
};
