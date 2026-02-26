import { createClient } from "jsr:@supabase/supabase-js@2";

const LIVE_URL = "https://www.toronto.ca/data/parks/live/skate_allupdates.json";

function mapLiveStatus(code: number): string {
  if (code === 1) return "open";
  if (code === 2) return "service_alert";
  return "closed";
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ function_name: "ingest-live-status", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  try {
    // Build a set of asset_ids we know about — live feed covers locations outside our CKAN data.
    // Only insert status records where we have a matching rink row.
    const { data: knownRinks } = await supabase
      .from("rinks")
      .select("asset_id");
    const knownAssetIds = new Set((knownRinks ?? []).map((r: any) => r.asset_id));

    // Also build known location_ids to null out location_id for unrecognized LocationIDs.
    const { data: knownLocations } = await supabase
      .from("locations")
      .select("id");
    const knownLocationIds = new Set((knownLocations ?? []).map((l: any) => l.id));

    const res = await fetch(LIVE_URL);
    const json = await res.json();
    const locations = json?.locations ?? {};

    const records: any[] = [];
    const skipped: number[] = [];
    for (const [, entries] of Object.entries(locations)) {
      for (const entry of entries as any[]) {
        if (!entry?.AssetID) continue;
        const assetId = Number(entry.AssetID);
        if (!knownAssetIds.has(assetId)) {
          skipped.push(assetId);
          continue;
        }
        const locationId = Number(entry.LocationID);
        records.push({
          asset_id: assetId,
          location_id: knownLocationIds.has(locationId) ? locationId : null,
          status: mapLiveStatus(Number(entry.Status)),
          reason: entry.Reason ?? null,
          comments: entry.Comments ?? null,
          season_start: entry.SeasonStart ?? null,
          season_end: entry.SeasonEnd ?? null,
          posted_date: entry.PostedDate ?? null,
          fetched_at: new Date().toISOString(),
        });
      }
    }

    if (records.length > 0) {
      const { error } = await supabase.from("rink_live_status").insert(records);
      if (error) throw new Error(`live status insert: ${error.message}`);
    }

    // Prune records older than 48 hours
    await supabase
      .from("rink_live_status")
      .delete()
      .lt("fetched_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    await supabase.from("sync_log").update({
      status: "success",
      finished_at: new Date().toISOString(),
      rows_upserted: { live_status: records.length, skipped_unknown_assets: skipped.length },
    }).eq("id", logId);

    return new Response(JSON.stringify({ ok: true, count: records.length, skipped: skipped.length, skipped_asset_ids: skipped }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    await supabase.from("sync_log").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_message: err.message,
    }).eq("id", logId);

    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
