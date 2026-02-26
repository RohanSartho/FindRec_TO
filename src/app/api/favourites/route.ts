import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/favourites — list current user's favourites
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        community_council,
        coordinates,
        rinks (
          asset_id,
          asset_name,
          rink_type,
          operated_by,
          rink_live_status (
            status,
            reason,
            fetched_at
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/favourites — add a favourite
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}

// DELETE /api/favourites — remove a favourite
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
