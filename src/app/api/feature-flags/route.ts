import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ── GET /api/feature-flags ─────────────────────────────────────────────────────
// Public — no auth required. Returns a flat { key: boolean } map so the client
// can gate features without exposing label/description copy.
//
// Response: { flags: Record<string, boolean> }
// Example:  { flags: { push_notifications: true } }
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, enabled");

    if (error) return NextResponse.json({ flags: {} });

    const flags: Record<string, boolean> = {};
    for (const row of data ?? []) flags[row.key] = row.enabled;

    return NextResponse.json({ flags }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ flags: {} });
  }
}
