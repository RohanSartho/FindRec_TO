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
//
// Activity filter strategy:
//   "skating"  → from rinks table (authoritative, works offline)
//   all others → from dropins + programs tables (reflects actual scheduled activities)
//   no filter  → from facilities + rinks (broad overview)

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

/** Get distinct location_ids that have sessions for a given activity_type (and optional sub_activity). */
async function locationIdsForActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  activityType: string,
  subActivity?: string
): Promise<Set<number>> {
  const ids = new Set<number>();

  type ActivityTypeEnum = "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other";
  const enumVal = activityType as ActivityTypeEnum;

  let dropinQ = supabase
    .from("dropins")
    .select("location_id")
    .eq("activity_type", enumVal)
    .not("location_id", "is", null)
    .limit(5000);
  if (subActivity) dropinQ = dropinQ.eq("sub_activity", subActivity);

  let programQ = supabase
    .from("programs")
    .select("location_id")
    .eq("activity_type", enumVal)
    .not("location_id", "is", null)
    .limit(5000);
  if (subActivity) programQ = programQ.eq("sub_activity", subActivity);

  const [dropinRes, programRes] = await Promise.all([dropinQ, programQ]);

  for (const r of dropinRes.data ?? [])  if (r.location_id) ids.add(r.location_id);
  for (const r of programRes.data ?? []) if (r.location_id) ids.add(r.location_id);

  return ids;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const activityType = searchParams.get("activity_type"); // e.g. "fitness"
  const subActivity  = searchParams.get("sub_activity") ?? undefined; // e.g. "Pickleball"
  const rinkType = searchParams.get("rink_type");         // "indoor" | "outdoor"
  const district = searchParams.get("district");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "5000";    // metres

  try {
    // ── Always fetch rinks (needed for rink info + skating filter) ────────────
    const { data: rinkRows } = await supabase
      .from("rinks")
      .select("location_id, asset_id, rink_type");

    const rinkMap = new Map<number, { asset_id: number; rink_type: string }>();
    for (const r of (rinkRows ?? []) as Array<{ location_id: number | null; asset_id: number | null; rink_type: string }>) {
      if (r.location_id && r.asset_id) {
        rinkMap.set(r.location_id, { asset_id: r.asset_id, rink_type: r.rink_type });
      }
    }

    // ── Resolve candidate location IDs based on activity filter ──────────────
    let locationIds: number[];
    // activityMap is used to show chips on each card; built differently per path
    const activityMap = new Map<number, Set<string>>();

    if (activityType === "skating") {
      // ── Skating: authoritative source is the rinks table ──────────────────
      let candidates = Array.from(rinkMap.keys());

      if (rinkType) {
        candidates = candidates.filter((id) => rinkMap.get(id)?.rink_type === rinkType);
      }

      locationIds = candidates;
      // Seed activityMap so chips render
      for (const id of locationIds) {
        activityMap.set(id, new Set(["skating"]));
      }

    } else if (activityType) {
      // ── Other activities: use dropins + programs (reflects real schedules) ──
      const ids = await locationIdsForActivity(supabase, activityType, subActivity);
      locationIds = Array.from(ids);

      // Seed activityMap so chips render; also add "skating" for rink venues
      for (const id of locationIds) {
        const types = new Set([activityType]);
        if (rinkMap.has(id)) types.add("skating");
        activityMap.set(id, types);
      }

    } else {
      // ── No filter: broad overview from facilities + rinks ─────────────────
      const facilityRows = await fetchAllFacilities(supabase);
      for (const f of facilityRows) {
        if (!activityMap.has(f.location_id)) activityMap.set(f.location_id, new Set());
        activityMap.get(f.location_id)!.add(f.activity_type);
      }
      // Supplement with rinks
      for (const [locId] of rinkMap) {
        if (!activityMap.has(locId)) activityMap.set(locId, new Set());
        activityMap.get(locId)!.add("skating");
      }

      // Exclude locations whose only activity is "other" and have no rink
      locationIds = Array.from(activityMap.keys()).filter((id) => {
        const types = activityMap.get(id)!;
        return !(types.size === 1 && types.has("other")) && !(types.size === 0);
      });
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
