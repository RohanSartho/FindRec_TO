import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/venues
// Query params:
//   activity_type: "skating"|"fitness"|"aquatics"|"arts"|"sports" (optional — omit = all)
//   rink_type: "indoor"|"outdoor" (optional — only applies when activity_type=skating)
//   district: district name (optional)
//   lat + lng + radius: geo filter (optional, radius in metres, default 5000)
//
// Returns locations enriched with:
//   activity_types: string[]      — activities available at this location
//   rink: { asset_id, rink_type } — present only if location has a skating rink

async function fetchAllFacilities(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Array<{ location_id: number; activity_type: string }>> {
  const pageSize = 1000;
  let offset = 0;
  const results: Array<{ location_id: number; activity_type: string }> = [];

  while (true) {
    const { data, error } = await supabase
      .from("facilities")
      .select("location_id, activity_type")
      .not("location_id", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error || !data || data.length === 0) break;
    results.push(...data as Array<{ location_id: number; activity_type: string }>);
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return results;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const activityType = searchParams.get("activity_type"); // e.g. "skating"
  const rinkType = searchParams.get("rink_type");         // "indoor" | "outdoor"
  const district = searchParams.get("district");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "5000";    // metres

  try {
    // ── Build activity-type map from facilities ──────────────────────────────
    const facilityRows = await fetchAllFacilities(supabase);
    const activityMap = new Map<number, Set<string>>();
    for (const f of facilityRows) {
      if (!activityMap.has(f.location_id)) activityMap.set(f.location_id, new Set());
      activityMap.get(f.location_id)!.add(f.activity_type);
    }

    // ── Fetch rinks to enrich with skating + type info ───────────────────────
    const { data: rinkRows } = await supabase
      .from("rinks")
      .select("location_id, asset_id, rink_type");

    const rinkMap = new Map<number, { asset_id: number; rink_type: string }>();
    for (const r of (rinkRows ?? []) as Array<{ location_id: number | null; asset_id: number | null; rink_type: string }>) {
      if (r.location_id && r.asset_id) {
        rinkMap.set(r.location_id, { asset_id: r.asset_id, rink_type: r.rink_type });
        // Ensure "skating" appears in activityMap for every rink location
        if (!activityMap.has(r.location_id)) activityMap.set(r.location_id, new Set());
        activityMap.get(r.location_id)!.add("skating");
      }
    }

    // ── Resolve candidate location IDs based on activity filter ──────────────
    let locationIds: number[];

    if (activityType) {
      let candidates = Array.from(activityMap.entries())
        .filter(([, types]) => types.has(activityType))
        .map(([id]) => id);

      // Rink-type sub-filter only applies to skating
      if (rinkType && activityType === "skating") {
        candidates = candidates.filter((id) => rinkMap.get(id)?.rink_type === rinkType);
      }

      locationIds = candidates;
    } else {
      // No activity filter — all locations with any known activity
      locationIds = Array.from(activityMap.keys());
    }

    if (locationIds.length === 0) return NextResponse.json({ data: [] });

    // ── Geo filter ───────────────────────────────────────────────────────────
    if (lat && lng) {
      const { data: nearbyLocs } = await supabase.rpc("locations_near", {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: parseInt(radius),
      });
      const nearbySet = new Set((nearbyLocs ?? []).map((l: { id: number }) => l.id));
      locationIds = locationIds.filter((id) => nearbySet.has(id));
      if (locationIds.length === 0) return NextResponse.json({ data: [] });
    }

    // ── District filter ──────────────────────────────────────────────────────
    if (district) {
      const { data: districtLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("district", district);
      const districtSet = new Set((districtLocs ?? []).map((l: { id: number }) => l.id));
      locationIds = locationIds.filter((id) => districtSet.has(id));
      if (locationIds.length === 0) return NextResponse.json({ data: [] });
    }

    // ── Query locations ──────────────────────────────────────────────────────
    const { data: locations, error } = await supabase
      .from("locations")
      .select("id, name, address, district")
      .in("id", locationIds)
      .order("name");

    if (error) throw error;

    // ── Enrich with activity types + rink info ───────────────────────────────
    const enriched = (locations ?? []).map((loc: { id: number; name: string; address: string | null; district: string | null }) => ({
      ...loc,
      activity_types: Array.from(activityMap.get(loc.id) ?? []).sort(),
      rink: rinkMap.get(loc.id) ?? null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
