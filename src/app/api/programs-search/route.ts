import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/programs-search
// Query params:
//   date_from: ISO date (default: today)
//   date_to:   ISO date (default: today + 30 days)
//   time_of_day: "" | "morning" | "afternoon" | "evening"
//   activity_type: "skating" | "fitness" | "aquatics" | "arts" | "sports"
//   sub_activity: exact sub_activity value
//   district: district name
//   lat + lng + radius_km: geo filter
//   age_category: "" | "baby" | "preschool" | "child" | "youth" | "adult" | "older"
//   q: text search on activity_title

// Age category → [minMonths, maxMonths] for overlap filter
const AGE_RANGES: Record<string, [number, number]> = {
  baby:       [0,   36],
  preschool:  [36,  72],
  child:      [72,  144],
  youth:      [144, 216],
  adult:      [216, 720],
  older:      [720, 9999],
};

// Time of day → [start_time_gte, start_time_lt]
const TIME_RANGES: Record<string, [string, string]> = {
  morning:   ["06:00:00", "12:00:00"],
  afternoon: ["12:00:00", "17:00:00"],
  evening:   ["17:00:00", "23:00:00"],
};

function defaultDateTo(from: string): string {
  const d = new Date(from + "T00:00:00");
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const today     = new Date().toISOString().split("T")[0];
  const dateFrom  = searchParams.get("date_from") ?? today;
  const dateTo    = searchParams.get("date_to")   ?? defaultDateTo(dateFrom);
  const timeOfDay = searchParams.get("time_of_day") ?? "";
  const activityType = searchParams.get("activity_type") ?? "";
  const subActivity  = searchParams.get("sub_activity")  ?? "";
  const district     = searchParams.get("district")      ?? "";
  const lat          = searchParams.get("lat");
  const lng          = searchParams.get("lng");
  const radiusKm     = parseFloat(searchParams.get("radius_km") ?? "5");
  const ageCategory  = searchParams.get("age_category") ?? "";
  const q            = searchParams.get("q") ?? "";

  const venueSearch = searchParams.get("venue_search") ?? "";

  try {
    // Step 1: resolve location IDs from geo / district / venue-name filter
    let locationIds: number[] | null = null;

    if (lat && lng) {
      const { data: nearbyLocs } = await supabase.rpc("locations_near", {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_m: Math.round(radiusKm * 1000),
      });
      locationIds = (nearbyLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { programs: [], total: 0 } });
      }
    } else if (district) {
      const { data: districtLocs } = await supabase
        .from("locations")
        .select("id")
        .eq("district", district);
      locationIds = (districtLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { programs: [], total: 0 } });
      }
    } else if (venueSearch) {
      const { data: venueLocs } = await supabase
        .from("locations")
        .select("id")
        .ilike("name", `%${venueSearch}%`);
      locationIds = (venueLocs ?? []).map((l: any) => l.id);
      if (locationIds.length === 0) {
        return NextResponse.json({ data: { programs: [], total: 0 } });
      }
    }

    // Step 2: build programs query
    type ActivityTypeEnum = "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other";
    let qb = supabase
      .from("programs")
      .select(`
        course_id,
        activity_title,
        course_title,
        days_of_week,
        start_date,
        end_date,
        start_time,
        end_time,
        min_age_months,
        max_age_months,
        activity_type,
        sub_activity,
        status,
        activity_url,
        program_category,
        location_id,
        locations (
          name,
          address,
          district,
          lat,
          lng
        )
      `)
      // Date overlap: program is active during the requested window
      .lte("start_date", dateTo)
      .gte("end_date", dateFrom)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(300);

    if (activityType) qb = qb.eq("activity_type", activityType as ActivityTypeEnum);
    if (subActivity)  qb = qb.eq("sub_activity", subActivity);
    if (locationIds)  qb = qb.in("location_id", locationIds);
    if (q)            qb = qb.or(`activity_title.ilike.%${q}%,course_title.ilike.%${q}%`);

    // Time of day filter on start_time
    const timeRange = TIME_RANGES[timeOfDay];
    if (timeRange) {
      qb = qb.gte("start_time", timeRange[0]).lt("start_time", timeRange[1]);
    }

    // Age category overlap filter
    const ageRange = AGE_RANGES[ageCategory];
    if (ageRange) {
      const [catMin, catMax] = ageRange;
      // Program's age range overlaps with category (or age is unrestricted / null)
      qb = qb.or(`max_age_months.gte.${catMin},max_age_months.is.null`);
      if (catMax < 9999) {
        qb = qb.or(`min_age_months.lte.${catMax},min_age_months.is.null`);
      }
    }

    const { data, error } = await qb;
    if (error) throw error;

    // Sort by location name, then start_date, then start_time (client-side for joined column)
    const programs = (data ?? []).sort((a: any, b: any) => {
      const nameA = (a.locations?.name ?? "").toLowerCase();
      const nameB = (b.locations?.name ?? "").toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      if (a.start_date !== b.start_date) return (a.start_date ?? "").localeCompare(b.start_date ?? "");
      return (a.start_time ?? "").localeCompare(b.start_time ?? "");
    });

    return NextResponse.json({ data: { programs, total: programs.length } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
