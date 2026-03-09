import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DROPIN_FILTER_OPTIONS } from "@/lib/config/dropinFilters";

// GET /api/dropin-search
// Query params:
//   date: ISO date string (default: today)
//   program_types: comma-separated course_title values (optional — omit = all skating)
//   district: district name (optional)
//   lat + lng + radius_km: geo filter (optional, radius in km)
//
// Returns drop-in sessions grouped by program type

// Derived from DROPIN_FILTER_OPTIONS — single source of truth for skating course titles
const SKATING_COURSE_TITLES = DROPIN_FILTER_OPTIONS.flatMap((o) => o.courseTitles);

// Age category → [minMonths, maxMonths] for overlap filter
const AGE_RANGES: Record<string, [number, number]> = {
  baby:       [0,   36],
  preschool:  [36,  72],
  child:      [72,  144],
  youth:      [144, 216],
  adult:      [216, 720],
  older:      [720, 9999],
};

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
  const ageCategoryParam = searchParams.get("age_category") ?? ""; // e.g. "adult"
  // Non-skating: filter by activity_type + optional sub_activity
  const activityTypeParam = searchParams.get("activity_type"); // e.g. "sports"
  const subActivityParam  = searchParams.get("sub_activity");  // e.g. "Pickleball"
  const venueSearch = searchParams.get("venue_search") ?? "";
  const nameSearch  = searchParams.get("q") ?? "";
  const isNonSkating = !!activityTypeParam && activityTypeParam !== "skating";

  // Resolve which course titles to filter on (skating mode only)
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
    } else if (venueSearch) {
      const { data: venueLocs } = await supabase
        .from("locations")
        .select("id")
        .ilike("name", `%${venueSearch}%`);
      locationIds = (venueLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { groups: [], total: 0, date } });
      }
    }

    // Step 2: Fetch drop-in sessions for the date
    const SELECT_FIELDS = `
      course_id,
      course_title,
      sub_activity,
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
        lat,
        lng,
        rinks (
          asset_id,
          rink_type
        )
      )
    `;

    let sessions: any[] = [];

    if (isNonSkating) {
      // ── Non-skating: filter by activity_type + optional sub_activity ────────
      type ActivityTypeEnum = "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other";
      let q = supabase
        .from("dropins")
        .select(SELECT_FIELDS)
        .eq("first_date", date)
        .eq("activity_type", activityTypeParam as ActivityTypeEnum)
        .order("start_time", { ascending: true });
      if (subActivityParam) q = q.eq("sub_activity", subActivityParam);
      if (locationIds) q = q.in("location_id", locationIds);
      if (timeStart) q = q.gt("end_time", timeStart);
      if (timeEnd)   q = q.lt("start_time", timeEnd);
      if (nameSearch) q = q.ilike("course_title", `%${nameSearch}%`);
      const ageRangeNS = AGE_RANGES[ageCategoryParam];
      if (ageRangeNS) {
        const [catMin, catMax] = ageRangeNS;
        q = q.or(`max_age_months.gte.${catMin},max_age_months.is.null`);
        if (catMax < 9999) q = q.or(`min_age_months.lte.${catMax},min_age_months.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      sessions = data ?? [];
    } else {
      // ── Skating / name-search: filter by course_title list (skipped for pure name search) ───
      let q = supabase
        .from("dropins")
        .select(SELECT_FIELDS)
        .eq("first_date", date)
        .order("start_time", { ascending: true });
      // Only restrict to skating titles when there is no free-text name search
      // (or when an explicit program_types param was supplied). Without this guard,
      // searching "Leisure swim" or "Lane swim" would return zero rows because those
      // are aquatics course_titles, not skating titles.
      if (!nameSearch || programTypesParam) {
        q = q.in("course_title", activeTitles);
      }
      if (locationIds) q = q.in("location_id", locationIds);
      if (timeStart) q = q.gt("end_time", timeStart);
      if (timeEnd)   q = q.lt("start_time", timeEnd);
      if (nameSearch) q = q.ilike("course_title", `%${nameSearch}%`);
      const ageRange = AGE_RANGES[ageCategoryParam];
      if (ageRange) {
        const [catMin, catMax] = ageRange;
        q = q.or(`max_age_months.gte.${catMin},max_age_months.is.null`);
        if (catMax < 9999) q = q.or(`min_age_months.lte.${catMax},min_age_months.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      sessions = data ?? [];
    }

    // Step 3: Group
    if (isNonSkating) {
      // Group by sub_activity (falls back to course_title if null)
      const groupMap = new Map<string, any[]>();
      for (const session of sessions) {
        const key: string = session.sub_activity ?? session.course_title ?? "Other";
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(session);
      }
      const groups = Array.from(groupMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([title, items]) => ({
          program_type: title,
          session_count: items.length,
          sessions: items.sort((a: any, b: any) => {
            const nameA = (a.locations?.name ?? "").toLowerCase();
            const nameB = (b.locations?.name ?? "").toLowerCase();
            return nameA !== nameB
              ? nameA.localeCompare(nameB)
              : (a.start_time ?? "").localeCompare(b.start_time ?? "");
          }),
        }));
      return NextResponse.json({ data: { groups, total: sessions.length, date } });
    }

    // Skating: group by course_title with explicit display order
    const groupMap = new Map<string, any[]>();
    for (const session of sessions) {
      const key: string = session.course_title ?? "Unknown";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(session);
    }

    // Explicit display order for every known course title
    const TITLE_ORDER: Record<string, number> = {
      // ── Leisure Skate ──────────────────────────────────────────────────────
      "Leisure Skate":                                          0,
      "Leisure Skate (Unsupervised)":                          1,
      "Leisure Skate: Older Adult":                            2,
      "Leisure Skate: Older Adult (Unsupervised)":             3,
      "Leisure Skate: Adult":                                  4,
      "Leisure Skate: Adult (Unsupervised)":                   5,
      "Leisure Skate (Pride Skate)":                           6,
      "Leisure Skate: Youth":                                  7,
      "Leisure Skate: Child with Caregiver":                   8,
      "Leisure Skate: Child with Caregiver (unsupervised)":    9,
      "Leisure Skate: Child with Caregiver (Unsupervised)":    9,
      "Leisure Skate: Early Years with Caregiver":            10,
      "Leisure Skate: Early Years with Caregiver (Unsupervised)": 11,
      "Adapted Leisure Skate with Family":                    12,
      // ── Shinny / Hockey ────────────────────────────────────────────────────
      "Shinny":                                              100,
      "Shinny (Unsupervised)":                               101,
      "Shinny (Women)":                                      102,
      "Shinny: Older Adult":                                 103,
      "Shinny: Older Adult (Unsupervised)":                  104,
      "Shinny: Older Adult (Women) (Unsupervised)":          105,
      "Shinny: Adult":                                       106,
      "Shinny: Adult (Unsupervised)":                        107,
      "Shinny: Youth":                                       108,
      "Shinny: Youth (Girls)":                               109,
      "Shinny: Youth (Unsupervised)":                        110,
      "Shinny: Child":                                       111,
      "Shinny: Child (Girls)":                               112,
      "Shinny: Child (Unsupervised)":                        113,
      "Shinny: Child with Caregiver":                        114,
      "Shinny: Child with Caregiver (unsupervised)":         115,
      "Shinny: Child with Caregiver (Unsupervised)":         115,
      "Shinny: Early Years with Caregiver":                  116,
      "Shinny: Early Years with Caregiver (Unsupervised)":   117,
    };

    const groups = Array.from(groupMap.entries())
      .sort((a, b) => (TITLE_ORDER[a[0]] ?? 999) - (TITLE_ORDER[b[0]] ?? 999))
      .map(([title, items]) => ({
        program_type: title,
        session_count: items.length,
        sessions: items.sort((a: any, b: any) => {
          const nameA = (a.locations?.name ?? "").toLowerCase();
          const nameB = (b.locations?.name ?? "").toLowerCase();
          return nameA !== nameB
            ? nameA.localeCompare(nameB)
            : (a.start_time ?? "").localeCompare(b.start_time ?? "");
        }),
      }));

    return NextResponse.json({
      data: {
        groups,
        total: sessions.length,
        date,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
