import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * In Next.js 15 (Turbopack), concurrent requests race for the cookie-store
 * Web Lock. The loser gets AbortError("lock broken") thrown at whatever await
 * is currently in-flight — not just at getUser(), but at createClient() or
 * even a DB query. Wrapping the entire handler is the only reliable guard.
 * Returning 401 is safe: the client (FavouritesContext) treats it as an empty
 * list; the user's actual session is untouched and retried on the next request.
 */
function isAbortError(err: unknown): boolean {
  const e = err as Error;
  return e?.name === "AbortError" || Boolean(e?.message?.includes("lock broken"));
}

// GET /api/favourites — list current user's favourites
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_favourites")
      .select(`
        id,
        created_at,
        location_id,
        locations (
          name,
          address,
          district,
          venue_type,
          lat,
          lng,
          rinks (
            asset_id,
            rink_type,
            rink_live_status (
              status,
              fetched_at
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// POST /api/favourites — add a favourite
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { location_id } = body;

    if (!location_id || typeof location_id !== "number") {
      return NextResponse.json({ error: "location_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_favourites")
      .insert({ user_id: user.id, location_id })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Already favourited" }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}

// DELETE /api/favourites — remove a favourite
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { location_id } = body;

    if (!location_id) {
      return NextResponse.json({ error: "location_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("location_id", location_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isAbortError(err)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw err;
  }
}
