import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("rinks")
    .select(`
      *,
      locations(name, address, district, community_council, ward, coordinates, raw_geometry),
      rink_live_status(status, reason, comments, posted_date, fetched_at)
    `)
    .eq("asset_id", parseInt(id))
    .order("fetched_at", { foreignTable: "rink_live_status", ascending: false })
    .limit(1, { foreignTable: "rink_live_status" })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}
