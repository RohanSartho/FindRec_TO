import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * AbortError guard — same pattern used across all auth-gated routes.
 * Next.js 15 / Turbopack can race the cookie-store Web Lock; returning 401
 * is safe since the client treats it as an unauthenticated state.
 */
function isAbortError(err: unknown): boolean {
  const e = err as Error;
  return e?.name === "AbortError" || Boolean(e?.message?.includes("lock broken"));
}

// ── GET /api/dropin-alerts ────────────────────────────────────────────────────
// Returns the user's alerts enriched with upcoming sessions in the next 7 days.
// Shape: { data: AlertWithSessions[] }
//
// AlertWithSessions: {
//   id, location_id, course_title, created_at,
//   location_name: string,
//   sessions: { first_date, start_time, end_time }[]   ← next 7 days only
// }
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch the user's alert rows + location name
    const { data: alerts, error: alertsError } = await supabase
      .from("user_dropin_alerts")
      .select(`
        id,
        location_id,
        course_title,
        created_at,
        locations ( name )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (alertsError) return NextResponse.json({ error: alertsError.message }, { status: 500 });
    if (!alerts || alerts.length === 0) return NextResponse.json({ data: [] });

    // Date window: today → today + 7 days (ISO strings, no time component)
    const today = new Date();
    const todayStr  = today.toISOString().slice(0, 10);
    const plusSeven = new Date(today);
    plusSeven.setDate(plusSeven.getDate() + 7);
    const plusSevenStr = plusSeven.toISOString().slice(0, 10);

    // For each alert, fetch matching drop-in sessions in the next 7 days.
    // We query in parallel to keep latency low.
    const enriched = await Promise.all(
      alerts.map(async (alert) => {
        const { data: sessions } = await supabase
          .from("dropins")
          .select("first_date, start_time, end_time")
          .eq("location_id", alert.location_id)
          .ilike("course_title", `%${alert.course_title}%`)
          .gte("first_date", todayStr)
          .lte("first_date", plusSevenStr)
          .order("first_date", { ascending: true })
          .order("start_time",  { ascending: true });

        return {
          id:            alert.id,
          location_id:   alert.location_id,
          course_title:  alert.course_title,
          created_at:    alert.created_at,
          location_name: (alert.locations as { name: string } | null)?.name ?? "Unknown",
          sessions:      sessions ?? [],
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// ── POST /api/dropin-alerts ───────────────────────────────────────────────────
// Body: { location_id: number, course_title: string }
// Returns 201 on success, 409 if the alert already exists.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { location_id, course_title } = body;

    if (!location_id || typeof location_id !== "number") {
      return NextResponse.json({ error: "location_id (number) required" }, { status: 400 });
    }
    if (!course_title || typeof course_title !== "string") {
      return NextResponse.json({ error: "course_title (string) required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_dropin_alerts")
      .insert({ user_id: user.id, location_id, course_title: course_title.trim() })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Alert already exists" }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// ── DELETE /api/dropin-alerts ─────────────────────────────────────────────────
// Body: { id: number }  — the alert row id to remove
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "id (number) required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_dropin_alerts")
      .delete()
      .eq("user_id", user.id)  // RLS defence-in-depth: only delete own rows
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
