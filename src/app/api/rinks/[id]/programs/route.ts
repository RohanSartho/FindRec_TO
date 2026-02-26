import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/rinks/[asset_id]/programs
// Returns drop-ins and registered programs for a rink's location
// Query params:
//   date: ISO date string (default: today)
//   view: "day" | "week" | "all" (default: "day")
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { searchParams } = req.nextUrl;

  const view = searchParams.get("view") ?? "day";
  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const targetDate = new Date(dateParam);

  // Map JS day (0=Sun) to our DB abbreviation
  const DAY_MAP: Record<number, string> = {
    0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed",
    4: "Thu", 5: "Fri", 6: "Sat",
  };
  const targetDayAbbr = DAY_MAP[targetDate.getDay()];

  // Calculate week bounds (Mon–Sun) of target date's week
  const dayOfWeek = targetDate.getDay(); // 0 = Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  // First get the rink's location_id from asset_id
  const { data: rink, error: rinkError } = await supabase
    .from("rinks")
    .select("location_id")
    .eq("asset_id", parseInt(id))
    .single();

  if (rinkError || !rink) {
    return NextResponse.json({ error: "Rink not found" }, { status: 404 });
  }

  const locationId = rink.location_id;

  if (!locationId) {
    return NextResponse.json({ data: { dropins: [], programs: [], meta: { location_id: null, view, date: dateParam, day: targetDayAbbr } } });
  }

  // Fetch drop-ins — each row is a single-day session, filter by first_date
  let dropinQuery = supabase
    .from("dropins")
    .select("course_id, course_title, section, day_of_week, first_date, last_date, start_time, end_time, min_age_months, max_age_months, activity_type")
    .eq("location_id", locationId)
    .order("first_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (view === "day") {
    // Single day — match exact date
    dropinQuery = dropinQuery.eq("first_date", dateParam);
  } else if (view === "week") {
    // Full week — all sessions from Monday to Sunday
    dropinQuery = dropinQuery
      .gte("first_date", weekStart)
      .lte("first_date", weekEnd);
  } else {
    // All — show next 60 days from target date
    const futureDate = new Date(targetDate);
    futureDate.setDate(targetDate.getDate() + 60);
    dropinQuery = dropinQuery
      .gte("first_date", dateParam)
      .lte("first_date", futureDate.toISOString().split("T")[0]);
  }

  const { data: dropins, error: dropinError } = await dropinQuery;
  if (dropinError) return NextResponse.json({ error: dropinError.message }, { status: 500 });

  // Fetch registered programs
  let programQuery = supabase
    .from("programs")
    .select("course_id, activity_title, course_title, section, days_of_week, start_date, end_date, start_time, end_time, min_age_months, max_age_months, activity_type, status, activity_url, program_category")
    .eq("location_id", locationId)
    .lte("start_date", dateParam)
    .gte("end_date", dateParam)
    .order("start_time");

  if (view === "day") {
    programQuery = programQuery.contains("days_of_week", [targetDayAbbr]);
  }

  const { data: programs, error: programError } = await programQuery;
  if (programError) return NextResponse.json({ error: programError.message }, { status: 500 });

  return NextResponse.json({
    data: {
      dropins: dropins ?? [],
      programs: programs ?? [],
      meta: {
        location_id: locationId,
        view,
        date: dateParam,
        day: targetDayAbbr,
      },
    },
  });
}
