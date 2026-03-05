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
//   "skating"  → from rinks table (authoritative)
//   all others → from dropins + programs tables (reflects real scheduled activities)
//   no filter  → union of all known activity types from dropins + programs + rinks

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
      // ── No filter: union of all non-skating activities from dropins + programs ──
      const KNOWN_NON_SKATING = ["fitness", "aquatics", "arts", "sports"] as const;

      const typeResults = await Promise.all(
        KNOWN_NON_SKATING.map((t) => locationIdsForActivity(supabase, t))
      );

      for (let i = 0; i < KNOWN_NON_SKATING.length; i++) {
        for (const id of typeResults[i]) {
          if (!activityMap.has(id)) activityMap.set(id, new Set());
          activityMap.get(id)!.add(KNOWN_NON_SKATING[i]);
        }
      }

      // Add skating from rinks (authoritative)
      for (const [locId] of rinkMap) {
        if (!activityMap.has(locId)) activityMap.set(locId, new Set());
        activityMap.get(locId)!.add("skating");
      }

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
    // For non-skating: filter by venue_type (skating is already filtered via rinkMap above)
    let locQuery = supabase
      .from("locations")
      .select("id, name, address, district, venue_type, lat, lng")
      .in("id", locationIds)
      .order("name");

    if (rinkType && activityType !== "skating") {
      locQuery = locQuery.eq("venue_type", rinkType);
    }

    const { data: locations, error } = await locQuery;

    if (error) throw error;

    // ── Enrich with activity types + rink info ───────────────────────────────
    const enriched = (locations ?? []).map((loc: { id: number; name: string; address: string | null; district: string | null; venue_type: string | null; lat: number | null; lng: number | null }) => ({
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
