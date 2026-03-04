import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/locations/[id]/programs
// Returns drop-ins and registered programs for a location directly by location_id
// (mirrors /api/rinks/[id]/programs but uses location_id directly instead of asset_id)
// Query params:
//   date: ISO date string (default: today)
//   view: "day" | "week" (default: "day")
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const { searchParams } = req.nextUrl;

  const locationId = parseInt(id);
  const view = searchParams.get("view") ?? "day";
  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const targetDate = new Date(dateParam);

  const DAY_MAP: Record<number, string> = {
    0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed",
    4: "Thu", 5: "Fri", 6: "Sat",
  };
  const targetDayAbbr = DAY_MAP[targetDate.getDay()];

  // Calculate week bounds (Mon–Sun)
  const dayOfWeek = targetDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];

  // Fetch drop-ins
  let dropinQuery = supabase
    .from("dropins")
    .select("course_id, course_title, section, day_of_week, first_date, last_date, start_time, end_time, min_age_months, max_age_months, activity_type, sub_activity")
    .eq("location_id", locationId)
    .order("first_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (view === "day") {
    dropinQuery = dropinQuery.eq("first_date", dateParam);
  } else {
    dropinQuery = dropinQuery.gte("first_date", weekStart).lte("first_date", weekEnd);
  }

  const { data: dropins, error: dropinError } = await dropinQuery;
  if (dropinError) return NextResponse.json({ error: dropinError.message }, { status: 500 });

  // Fetch registered programs
  let programQuery = supabase
    .from("programs")
    .select("course_id, activity_title, course_title, section, days_of_week, start_date, end_date, start_time, end_time, min_age_months, max_age_months, activity_type, sub_activity, status, activity_url, program_category")
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
      meta: { location_id: locationId, view, date: dateParam, day: targetDayAbbr },
    },
  });
}
