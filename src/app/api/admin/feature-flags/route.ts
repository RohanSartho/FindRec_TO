import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin-only routes — guard with admin_token cookie (same secret as the
// /internal-ops-findrecto page guard in middleware.ts).
function isAdmin(req: NextRequest): boolean {
  const token  = req.cookies.get("admin_token")?.value;
  const secret = process.env.ADMIN_SECRET;
  return Boolean(secret && token === secret);
}

// Use the service_role client so writes bypass RLS.
// feature_flags has no public write policy — only service_role can update.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── GET /api/admin/feature-flags ──────────────────────────────────────────────
// Returns all flags with full metadata (key, enabled, label, description).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await serviceClient()
    .from("feature_flags")
    .select("key, enabled, label, description")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// ── PATCH /api/admin/feature-flags ────────────────────────────────────────────
// Body: { key: string, enabled: boolean }
// Toggles a single flag. Returns the updated row.
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { key, enabled } = body;

  if (typeof key !== "string" || key.trim() === "") {
    return NextResponse.json({ error: "key (string) required" }, { status: 400 });
  }
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 });
  }

  const { data, error } = await serviceClient()
    .from("feature_flags")
    .update({ enabled })
    .eq("key", key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
