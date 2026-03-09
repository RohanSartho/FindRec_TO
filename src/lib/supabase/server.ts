import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

export async function createClient() {
  // In Next.js 15 (Turbopack), the cookie-store uses a Web Lock. Concurrent
  // requests (middleware + RSC + route handlers) race for it; the loser gets
  // AbortError("lock broken"). We catch it here — the one place all callers
  // share — and fall back to an empty cookie jar (anonymous session). The page
  // still renders; auth state is recovered on the very next request.
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    // AbortError: lock broken by concurrent request — safe to fall back to anonymous
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          try {
            return cookieStore?.getAll() ?? [];
          } catch {
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
