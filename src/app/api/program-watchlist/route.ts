import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** AbortError guard — same pattern used across all auth-gated routes. */
function isAbortError(err: unknown): boolean {
  const e = err as Error;
  return e?.name === "AbortError" || Boolean(e?.message?.includes("lock broken"));
}

// ── GET /api/program-watchlist ────────────────────────────────────────────────
// Returns the user's watchlist entries enriched with live program data.
// Shape: { data: WatchlistEntry[] }
//
// WatchlistEntry: {
//   id, course_id, location_id, created_at,
//   course_title, activity_title, status, start_date, end_date,
//   start_time, end_time, activity_url,
//   location_name: string
// }
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch watchlist rows
    const { data: entries, error: listError } = await supabase
      .from("user_program_watchlist")
      .select("id, course_id, location_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    if (!entries || entries.length === 0) return NextResponse.json({ data: [] });

    // For each entry, look up the current program state.
    // We match on (course_id, location_id) — programs have stable IDs.
    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const { data: programs } = await supabase
          .from("programs")
          .select(`
            course_id,
            course_title,
            activity_title,
            status,
            start_date,
            end_date,
            start_time,
            end_time,
            activity_url,
            locations ( name )
          `)
          .eq("course_id",   entry.course_id)
          .eq("location_id", entry.location_id)
          .limit(1);

        const prog = programs?.[0] ?? null;

        return {
          id:             entry.id,
          course_id:      entry.course_id,
          location_id:    entry.location_id,
          created_at:     entry.created_at,
          course_title:   prog?.course_title   ?? null,
          activity_title: prog?.activity_title ?? null,
          status:         prog?.status         ?? null,
          start_date:     prog?.start_date     ?? null,
          end_date:       prog?.end_date       ?? null,
          start_time:     prog?.start_time     ?? null,
          end_time:       prog?.end_time       ?? null,
          activity_url:   prog?.activity_url   ?? null,
          location_name:  (prog?.locations as { name: string } | null)?.name ?? "Unknown",
        };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// ── POST /api/program-watchlist ───────────────────────────────────────────────
// Body: { course_id: number, location_id: number }
// Returns 201 on success, 409 if entry already exists.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { course_id, location_id } = body;

    if (!course_id || typeof course_id !== "number") {
      return NextResponse.json({ error: "course_id (number) required" }, { status: 400 });
    }
    if (!location_id || typeof location_id !== "number") {
      return NextResponse.json({ error: "location_id (number) required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_program_watchlist")
      .insert({ user_id: user.id, course_id, location_id })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Already on watchlist" }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// ── DELETE /api/program-watchlist ─────────────────────────────────────────────
// Body: { id: number }  — the watchlist row id to remove
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
      .from("user_program_watchlist")
      .delete()
      .eq("user_id", user.id)  // RLS defence-in-depth
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
