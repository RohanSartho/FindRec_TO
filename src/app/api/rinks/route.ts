import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const type = searchParams.get("type"); // "indoor" | "outdoor"
  const district = searchParams.get("district");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "5000";

  try {
    // Geo query — use PostGIS RPC
    if (lat && lng) {
      const { data, error } = await supabase.rpc("locations_near", {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: parseInt(radius),
      });
      if (error) throw error;

      // Fetch rinks for returned location IDs
      const locationIds = data.map((l: any) => l.id);
      let rinkQuery = supabase
        .from("rinks")
        .select(`*, locations(name, address, district, coordinates)`)
        .in("location_id", locationIds);

      if (type) rinkQuery = rinkQuery.eq("rink_type", type as "indoor" | "outdoor");

      const { data: rinks, error: rinkError } = await rinkQuery;
      if (rinkError) throw rinkError;

      return NextResponse.json({ data: rinks, source: "geo" });
    }

    // Standard query
    let locationIds: number[] | null = null;

    if (district) {
      const { data: districtLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("district", district);
      locationIds = (districtLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: [] });
      }
    }

    let query = supabase
      .from("rinks")
      .select(`*, locations(name, address, district, community_council, coordinates)`)
      .order("asset_name");

    if (type) query = query.eq("rink_type", type as "indoor" | "outdoor");
    if (locationIds) query = query.in("location_id", locationIds);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
