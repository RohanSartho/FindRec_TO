import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/districts — distinct districts + community councils for filter UI
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select("district, community_council")
    .not("district", "is", null)
    .order("district");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate
  const seen = new Set<string>();
  const districts = data
    .filter((r) => {
      const key = `${r.district}__${r.community_council}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((r) => ({
      district: r.district,
      community_council: r.community_council,
    }));

  return NextResponse.json({ data: districts });
}
