import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/dropin-search
// Query params:
//   date: ISO date string (default: today)
//   program_types: comma-separated course_title values (optional — omit = all skating)
//   district: district name (optional)
//   lat + lng + radius_km: geo filter (optional, radius in km)
//
// Returns drop-in sessions grouped by program type
// Scoped to skating locations only

const SKATING_COURSE_TITLES = [
  "Leisure Skate",
  "Leisure Skate (Unsupervised)",
  "Leisure Skate (Pride Skate)",
  "Adapted Leisure Skate with Family",
  "Leisure Skate: Adult",
  "Leisure Skate: Adult (Unsupervised)",
  "Leisure Skate: Child with Caregiver",
  "Leisure Skate: Child with Caregiver (unsupervised)",
  "Leisure Skate: Child with Caregiver (Unsupervised)",
  "Leisure Skate: Early Years with Caregiver",
  "Leisure Skate: Early Years with Caregiver (Unsupervised)",
  "Leisure Skate: Older Adult",
  "Leisure Skate: Older Adult (Unsupervised)",
  "Leisure Skate: Youth",
  "Shinny",
  "Shinny (Unsupervised)",
  "Shinny (Women)",
  "Shinny: Adult",
  "Shinny: Adult (Unsupervised)",
  "Shinny: Child",
  "Shinny: Child (Girls)",
  "Shinny: Child (Unsupervised)",
  "Shinny: Child with Caregiver",
  "Shinny: Child with Caregiver (unsupervised)",
  "Shinny: Child with Caregiver (Unsupervised)",
  "Shinny: Early Years with Caregiver",
  "Shinny: Early Years with Caregiver (Unsupervised)",
  "Shinny: Older Adult",
  "Shinny: Older Adult (Unsupervised)",
  "Shinny: Older Adult (Women) (Unsupervised)",
  "Shinny: Youth",
  "Shinny: Youth (Girls)",
  "Shinny: Youth (Unsupervised)",
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const programTypesParam = searchParams.get("program_types");
  const district = searchParams.get("district");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radiusKm = parseFloat(searchParams.get("radius_km") ?? "5");
  const timeStart = searchParams.get("time_start"); // e.g. "12:00:00"
  const timeEnd = searchParams.get("time_end");     // e.g. "17:00:00"

  // Resolve which course titles to filter on
  const activeTitles = programTypesParam
    ? programTypesParam.split(",").map((t) => t.trim())
    : SKATING_COURSE_TITLES;

  try {
    // Step 1: Resolve location IDs based on geo or district filter
    let locationIds: number[] | null = null;

    if (lat && lng) {
      const { data: nearbyLocs } = await supabase.rpc("locations_near", {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: Math.round(radiusKm * 1000),
      });
      locationIds = (nearbyLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { groups: [], total: 0, date } });
      }
    } else if (district) {
      const { data: districtLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("district", district);
      locationIds = (districtLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { groups: [], total: 0, date } });
      }
    }

    // Step 2: Fetch drop-in sessions for the date
    let query = supabase
      .from("dropins")
      .select(`
        course_id,
        course_title,
        day_of_week,
        first_date,
        start_time,
        end_time,
        min_age_months,
        max_age_months,
        activity_type,
        location_id,
        locations (
          name,
          address,
          district,
          rinks (
            asset_id,
            rink_type
          )
        )
      `)
      .eq("first_date", date)
      .in("course_title", activeTitles)
      .order("start_time", { ascending: true });

    if (locationIds) query = query.in("location_id", locationIds);
    if (timeStart) query = query.gte("start_time", timeStart);
    if (timeEnd) query = query.lt("start_time", timeEnd);

    const { data: sessions, error } = await query;
    if (error) throw error;

    // Step 3: Group by course_title
    const groupMap = new Map<string, any[]>();
    for (const session of sessions ?? []) {
      const key: string = session.course_title ?? "Unknown";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(session);
    }

    // Sort groups by session count desc, then alpha
    const groups = Array.from(groupMap.entries())
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([title, items]) => ({
        program_type: title,
        session_count: items.length,
        sessions: items.sort((a: any, b: any) =>
          (a.start_time ?? "").localeCompare(b.start_time ?? "")
        ),
      }));

    return NextResponse.json({
      data: {
        groups,
        total: sessions?.length ?? 0,
        date,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
