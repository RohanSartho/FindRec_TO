import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/programs
// Query params:
//   location_id (required or activity_type required)
//   activity_type: "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other"
//   type: "registered" | "dropin" (default: both)
//   date: ISO date string — filter programs active on this date
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = req.nextUrl;

  const location_id = searchParams.get("location_id");
  const activity_type = searchParams.get("activity_type");
  const type = searchParams.get("type"); // "registered" | "dropin"
  const date = searchParams.get("date");

  if (!location_id && !activity_type) {
    return NextResponse.json(
      { error: "Provide at least location_id or activity_type" },
      { status: 400 }
    );
  }

  const results: { registered?: any[]; dropins?: any[] } = {};

  // Registered programs
  if (!type || type === "registered") {
    let q = supabase
      .from("programs")
      .select(`
        course_id, activity_title, course_title, section,
        days_of_week, start_date, end_date, start_time, end_time,
        min_age_months, max_age_months, status, activity_url,
        program_category, activity_type,
        locations(name, address, district)
      `)
      .order("start_date", { ascending: true });

    if (location_id) q = q.eq("location_id", parseInt(location_id));
    if (activity_type) q = q.eq("activity_type", activity_type as "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other");
    if (date) {
      q = q.lte("start_date", date).gte("end_date", date);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    results.registered = data;
  }

  // Drop-ins
  if (!type || type === "dropin") {
    let q = supabase
      .from("dropins")
      .select(`
        course_id, course_title, section, day_of_week,
        first_date, last_date, start_time, end_time,
        min_age_months, max_age_months, activity_type,
        locations(name, address, district)
      `)
      .order("first_date", { ascending: true });

    if (location_id) q = q.eq("location_id", parseInt(location_id));
    if (activity_type) q = q.eq("activity_type", activity_type as "skating" | "fitness" | "aquatics" | "arts" | "sports" | "other");
    if (date) {
      q = q.lte("first_date", date).gte("last_date", date);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    results.dropins = data;
  }

  return NextResponse.json({ data: results });
}
