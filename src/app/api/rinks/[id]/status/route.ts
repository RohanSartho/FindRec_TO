import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("rink_live_status")
    .select("status, reason, comments, posted_date, fetched_at")
    .eq("asset_id", parseInt(id))
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return NextResponse.json({ status: "unknown" }, { status: 200 });
  return NextResponse.json({ data });
}
