import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow API routes that use their own auth (CRON_SECRET / bearer token).
  // For routes with mixed auth (UI session OR admin Bearer), we only let the
  // Bearer-token path skip middleware — browser sessions still flow through
  // the standard redirect logic.
  const hasBearerToken =
    request.headers.get("authorization")?.startsWith("Bearer ") ?? false;
  const isPublicApi =
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/push/send") ||
    (hasBearerToken && pathname.startsWith("/api/portfolio/time-machine/backfill"));

  // Routes accessible without authentication (landing + explore tabs + their API routes)
  const isGuestRoute =
    pathname === "/" ||
    pathname.startsWith("/plays") ||
    pathname.startsWith("/today") ||
    pathname.startsWith("/csp-hunter") ||
    pathname.startsWith("/research") ||
    pathname.startsWith("/api/movers") ||
    pathname.startsWith("/api/bloodbath") ||
    pathname.startsWith("/api/recommendations") ||
    pathname.startsWith("/api/flow") ||
    pathname.startsWith("/api/csp-hunter");

  // Redirect unauthenticated users to login
  if (
    !user &&
    !isPublicApi &&
    !isGuestRoute &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from landing page to app home
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // sw.js + manifest.json MUST bypass auth: a 307 on a service-worker
    // script fetch is a fatal registration error (and the redirect was being
    // CDN-cached as public). Push notifications were dead because of this.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
