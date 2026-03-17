import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * AbortError guard — same pattern used across all auth-gated routes.
 */
function isAbortError(err: unknown): boolean {
  const e = err as Error;
  return e?.name === "AbortError" || Boolean(e?.message?.includes("lock broken"));
}

// ── POST /api/push-subscribe ──────────────────────────────────────────────────
// Body: { endpoint: string, p256dh: string, auth: string }
// Upserts a Web Push subscription for the current user.
// Uses endpoint as the unique key — if it already exists the row is updated.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "endpoint (string) required" }, { status: 400 });
    }
    if (!p256dh || typeof p256dh !== "string") {
      return NextResponse.json({ error: "p256dh (string) required" }, { status: 400 });
    }
    if (!auth || typeof auth !== "string") {
      return NextResponse.json({ error: "auth (string) required" }, { status: 400 });
    }

    // Upsert on endpoint — each browser/device has a unique endpoint
    const { error } = await supabase
      .from("user_push_subscriptions")
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// ── DELETE /api/push-subscribe ────────────────────────────────────────────────
// Body: { endpoint: string }
// Removes a Web Push subscription by endpoint.
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "endpoint (string) required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_push_subscriptions")
      .delete()
      .eq("user_id", user.id)  // RLS defence-in-depth: only delete own rows
      .eq("endpoint", endpoint);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
