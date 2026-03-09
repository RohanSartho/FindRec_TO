/**
 * refresh-program-status
 *
 * Lightweight daily job: re-fetches ONLY the "Status / Information" column
 * from the CKAN registered-programs resource and updates programs.status in
 * Supabase. Runs in ~30–60 s (vs 5–10 min for a full ingest-ckan run).
 *
 * Schedule: once daily at 08:00 UTC (04:00 ET) — see config.toml
 *
 * Why a separate function?
 * - ingest-ckan runs weekly (Sunday) and updates every column
 * - Enrollment status changes daily: "Open" → "Waitlist" → "Full"
 * - This function closes the freshness gap without touching locations/rinks/etc.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const UPSERT_CHUNK = 500;

function nullify(val: any): string | null {
  if (val === "None" || val === "null" || val === "" || val == null) return null;
  return String(val);
}

/** Normalize a raw CKAN status string into one of our four canonical values.
 *  Kept broad so that any future wording variants still map correctly.
 */
function normalizeStatus(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  // Order matters: check waitlist before full (some strings say "Waitlist: 2 Available")
  if (lower.includes("waitlist") || lower.includes("wait list")) return "Waitlist Available";
  if (lower.includes("full")) return "Full";
  if (lower.includes("cancel")) return "Cancelled";
  if (lower.includes("started") || lower.includes("in progress")) return "This course has started";
  if (lower.includes("open") || lower.includes("avail")) return "Open";
  // Return the raw value unchanged for any other status strings so we don't lose info
  return raw;
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ function_name: "refresh-program-status", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  try {
    // ── 1. Find the registered-programs CKAN resource ID ─────────────────────
    const pkgUrl = `${CKAN_BASE}/api/3/action/package_show?id=registered-programs-and-drop-in-courses-offering`;
    const pkgRes = await fetch(pkgUrl);
    const pkgJson = await pkgRes.json();
    const resources: any[] = pkgJson?.result?.resources ?? [];

    const programsResourceId = resources.find(
      (r: any) => r.datastore_active && r.name?.toLowerCase().includes("registered")
    )?.id;

    if (!programsResourceId) {
      throw new Error("Could not locate the registered-programs CKAN resource");
    }

    // ── 2. Stream all pages, collect {course_id, status} ─────────────────────
    let offset = 0;
    const limit = 1000;
    let totalProcessed = 0;
    let totalUpdated = 0;

    while (true) {
      const url = `${CKAN_BASE}/api/3/action/datastore_search?resource_id=${programsResourceId}&limit=${limit}&offset=${offset}&fields=Course_ID,Status%20%2F%20Information`;
      const res = await fetch(url);
      const json = await res.json();
      const batch: any[] = json?.result?.records ?? [];
      if (batch.length === 0) break;

      // Build upsert rows — only course_id + status
      const rows = batch
        .filter((r: any) => r["Course_ID"] != null)
        .map((r: any) => ({
          course_id: Number(r["Course_ID"]),
          status: normalizeStatus(nullify(r["Status / Information"])),
        }));

      // Upsert on course_id — only updates the `status` column (and triggers updated_at)
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK);
        const { error } = await supabase
          .from("programs")
          .upsert(chunk, { onConflict: "course_id", ignoreDuplicates: false });
        if (error) throw new Error(`upsert programs status (offset ${offset + i}): ${error.message}`);
        totalUpdated += chunk.length;
      }

      totalProcessed += batch.length;
      if (batch.length < limit) break;
      offset += limit;
    }

    // ── 3. Log success ────────────────────────────────────────────────────────
    await supabase.from("sync_log").update({
      status: "success",
      finished_at: new Date().toISOString(),
      rows_upserted: { programs_status_refreshed: totalUpdated, ckan_rows_read: totalProcessed },
    }).eq("id", logId);

    return new Response(
      JSON.stringify({ ok: true, ckan_rows_read: totalProcessed, programs_updated: totalUpdated }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    await supabase.from("sync_log").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: err.message,
    }).eq("id", logId);

    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
