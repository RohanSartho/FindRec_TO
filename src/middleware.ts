import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIX = "/internal-ops-findrecto";
const ADMIN_LOGIN  = `${ADMIN_PREFIX}/login`;

/** Routes that require a valid admin_token cookie. */
const ADMIN_GUARDED = [ADMIN_PREFIX, "/testblue"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin route guard ──────────────────────────────────────────────────────
  // /internal-ops-findrecto/* and /testblue/* require a valid admin_token
  // cookie. The login page itself is always accessible.
  const needsAdmin =
    pathname !== ADMIN_LOGIN &&
    ADMIN_GUARDED.some((prefix) => pathname.startsWith(prefix));

  if (needsAdmin) {
    const token  = request.cookies.get("admin_token")?.value;
    const secret = process.env.ADMIN_SECRET;
    if (!secret || token !== secret) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    }
  }

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
          // Wrap in try/catch — Next.js 15 cookie store lock can be stolen by
          // a concurrent request. Silently dropping is safe here: the session
          // refresh will be retried on the next request via getUser().
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          } catch {
            // AbortError: lock broken — safe to ignore
          }
        },
      },
    }
  );

  // Refresh session — required for Server Components.
  // Wrapped in try/catch: on pages like /activities that fire 3+ concurrent API
  // requests, multiple middleware instances race to refresh the session token and
  // write cookies, which throws AbortError ("lock broken") in Next.js 15. Dropping
  // the error is safe — the session is still readable from existing cookies, and
  // a successful refresh will happen on the next request.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // AbortError: lock broken by concurrent request — safe to ignore
  }

  // Protect /api/favourites — require auth
  if (
    request.nextUrl.pathname.startsWith("/api/favourites") &&
    !user
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
