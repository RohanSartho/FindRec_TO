import { createClient } from "jsr:@supabase/supabase-js@2";

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const UPSERT_CHUNK = 500;  // max rows per upsert call

// ─── Helpers ────────────────────────────────────────────────────────────────

/** CKAN serializes Python None as the string "None". Normalize to JS null. */
function nullify(val: any): any {
  if (val === "None" || val === "null" || val === "") return null;
  return val ?? null;
}

function parseNonIsoDate(raw: string): string | null {
  if (!raw) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const match = raw.trim().match(/^([A-Za-z]{3})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, mon, day, year] = match;
  const mm = months[mon];
  if (!mm) return null;
  return `${year}-${mm}-${day}`;
}

function parseFromTo(fromTo: string): { start_date: string | null; end_date: string | null } {
  if (!fromTo) return { start_date: null, end_date: null };
  const parts = fromTo.split(" to ");
  return {
    start_date: parseNonIsoDate(parts[0]),
    end_date: parseNonIsoDate(parts[1]),
  };
}

function parseDaysOfWeek(raw: string): string[] {
  if (!raw) return [];
  return raw.trim().split(/\s+/).filter(Boolean);
}

function parseTime(hour: number | string, min: number | string): string | null {
  const h = String(hour).padStart(2, "0");
  const m = String(min).padStart(2, "0");
  if (h === "00" && m === "00") return null;
  return `${h}:${m}:00`;
}

function inferActivityType(category: string, title: string): string {
  const val = `${category} ${title}`.toLowerCase();
  if (val.includes("skat") || val.includes("hockey") || val.includes("ice")) return "skating";
  if (val.includes("swim") || val.includes("pool") || val.includes("aqua")) return "aquatics";
  if (val.includes("fitness") || val.includes("yoga") || val.includes("cardio") || val.includes("pilates")) return "fitness";
  if (val.includes("art") || val.includes("paint") || val.includes("craft") || val.includes("music") || val.includes("dance")) return "arts";
  if (val.includes("sport") || val.includes("basketball") || val.includes("tennis") || val.includes("soccer") || val.includes("baseball")) return "sports";
  return "other";
}

/** Fetches all pages from a CKAN datastore resource, calling processBatch for each page. */
async function streamCkanResource(
  resourceId: string,
  processBatch: (records: any[]) => Promise<void>
): Promise<number> {
  let offset = 0;
  let total = 0;
  const limit = 1000;
  while (true) {
    const url = `${CKAN_BASE}/api/3/action/datastore_search?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    const json = await res.json();
    const batch: any[] = json?.result?.records ?? [];
    if (batch.length === 0) break;
    await processBatch(batch);
    total += batch.length;
    if (batch.length < limit) break;
    offset += limit;
  }
  return total;
}

/** Fetches all pages into memory — only used for small datasets (rinks ≤ 70 rows). */
async function fetchCkanResource(resourceId: string): Promise<any[]> {
  const records: any[] = [];
  await streamCkanResource(resourceId, async (batch) => { records.push(...batch); });
  return records;
}

async function fetchCkanPackage(packageId: string): Promise<any> {
  const url = `${CKAN_BASE}/api/3/action/package_show?id=${packageId}`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.result;
}

/** Splits array into chunks and upserts each chunk sequentially. */
async function batchUpsert(
  supabase: any,
  table: string,
  rows: any[],
  batchSize: number,
  onConflict?: string
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const upsertOptions = onConflict
      ? { onConflict, ignoreDuplicates: false }
      : { ignoreDuplicates: false };
    const { error } = await supabase.from(table).upsert(batch, upsertOptions);
    if (error) throw new Error(`batchUpsert ${table}: ${error.message}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ function_name: "ingest-ckan", status: "running" })
    .select()
    .single();
  const logId = logEntry?.id;

  const rowCounts: Record<string, number> = {};

  try {
    // ── 1. LOCATIONS (from programs dataset locations sub-table) ──────────────
    const locationsPkg = await fetchCkanPackage("registered-programs-and-drop-in-courses-offering");
    const locationsResourceId = locationsPkg?.resources?.find((r: any) =>
      r.datastore_active && r.name?.toLowerCase().includes("location")
    )?.id;

    if (locationsResourceId) {
      const rawLocations = await fetchCkanResource(locationsResourceId);
      const locations = rawLocations.map((r: any) => ({
        id: r["Location ID"] ?? r["locationid"] ?? r["_id"],
        name: r["Location Name"] ?? r["Parent Asset Name"] ?? r["name"] ?? "",
        address: r["Address"] ?? null,
        postal_code: r["Postal Code"] ?? null,
        ward: r["Ward"] ? String(r["Ward"]) : null,
        community_council: r["Community Council Area"] ?? null,
        district: r["Community Council Area"] ?? null,
        ...(r["geometry"] ? { raw_geometry: JSON.parse(r["geometry"]) } : {}),
      }));
      await batchUpsert(supabase, "locations", locations, UPSERT_CHUNK, "id");
      rowCounts.locations = locations.length;
    }

    // ── 2. INDOOR RINKS ───────────────────────────────────────────────────────
    const indoorPkg = await fetchCkanPackage("indoor-ice-rinks");
    const indoorResourceId = indoorPkg?.resources?.find((r: any) =>
      r.datastore_active && r.format?.toLowerCase() === "xlsx"
    )?.id ?? indoorPkg?.resources?.find((r: any) => r.datastore_active)?.id;

    if (indoorResourceId) {
      const rawIndoor = await fetchCkanResource(indoorResourceId);  // 63 rows — safe in memory

      const rinkLocations = rawIndoor
        .filter((r: any) => r["locationid"] && r["Address"])
        .map((r: any) => {
          let rawGeo = null;
          try { rawGeo = r["geometry"] ? JSON.parse(r["geometry"]) : null; } catch {}
          return {
            id: Number(r["locationid"]),
            name: r["Parent Asset Name"] ?? "",
            address: r["Address"] ?? null,
            postal_code: r["Postal Code"] ?? null,
            ward: r["Ward"] ? String(r["Ward"]) : null,
            community_council: r["Community Council Area"] ?? null,
            district: r["Community Council Area"] ?? null,
            ...(rawGeo ? { raw_geometry: rawGeo } : {}),
          };
        });
      // Upsert rink locations — always update raw_geometry when we have it
      for (const loc of rinkLocations) {
        await supabase.from("locations")
          .upsert(loc, { onConflict: "id" });
      }

      const rinks = rawIndoor.map((r: any) => ({
        location_id: Number(r["locationid"]),
        asset_id: Number(r["Asset ID"]),
        asset_name: r["Asset Name"] ?? "",
        public_name: r["Public Name"] ?? null,
        rink_type: "indoor" as const,
        pad_length_ft: r["Pad Length"] ? Number(r["Pad Length"]) : null,
        pad_width_ft: r["Pad Width"] ? Number(r["Pad Width"]) : null,
        ice_pad_size: r["Ice Pad Size Category"] ?? null,
        permit_class: r["Permit Classification"] ?? null,
        operated_by: r["Operated By"] ?? null,
        has_boards: r["Boards (Ice Rink)"]?.toLowerCase() === "yes",
        activity_type: "skating",
        metadata: {},
      }));
      await batchUpsert(supabase, "rinks", rinks, UPSERT_CHUNK, "asset_id");
      rowCounts.indoor_rinks = rinks.length;
    }

    // ── 3. OUTDOOR RINKS ──────────────────────────────────────────────────────
    const outdoorPkg = await fetchCkanPackage("outdoor-artificial-ice-rinks");
    const outdoorResourceId = outdoorPkg?.resources?.find((r: any) =>
      r.datastore_active && r.format?.toLowerCase() === "xlsx"
    )?.id ?? outdoorPkg?.resources?.find((r: any) => r.datastore_active)?.id;

    if (outdoorResourceId) {
      const rawOutdoor = await fetchCkanResource(outdoorResourceId);  // 69 rows — safe in memory

      const outdoorLocations = rawOutdoor
        .filter((r: any) => r["locationid"] && r["Address"])
        .map((r: any) => {
          let rawGeo = null;
          try { rawGeo = r["geometry"] ? JSON.parse(r["geometry"]) : null; } catch {}
          return {
            id: Number(r["locationid"]),
            name: r["Parent Asset Name"] ?? "",
            address: r["Address"] ?? null,
            postal_code: r["Postal Code"] ?? null,
            ward: r["Ward"] ? String(r["Ward"]) : null,
            community_council: r["Community Council Area"] ?? null,
            district: r["Community Council Area"] ?? null,
            ...(rawGeo ? { raw_geometry: rawGeo } : {}),
          };
        });
      // Upsert rink locations — always update raw_geometry when we have it
      for (const loc of outdoorLocations) {
        await supabase.from("locations")
          .upsert(loc, { onConflict: "id" });
      }

      const rinks = rawOutdoor.map((r: any) => ({
        location_id: Number(r["locationid"]),
        asset_id: Number(r["Asset ID"]),
        asset_name: r["Asset Name"] ?? "",
        public_name: r["Public Name"] ?? null,
        rink_type: "outdoor" as const,
        pad_length_ft: r["Pad Length"] ? Number(r["Pad Length"]) : null,
        pad_width_ft: r["Pad Width"] ? Number(r["Pad Width"]) : null,
        ice_pad_size: r["Ice Pad Size Category"] ?? null,
        permit_class: r["Permit Classification"] ?? null,
        operated_by: r["Operated By"] ?? null,
        has_boards: r["Boards (Ice Rink)"]?.toLowerCase() === "yes",
        activity_type: "skating",
        metadata: {},
      }));
      await batchUpsert(supabase, "rinks", rinks, UPSERT_CHUNK, "asset_id");
      rowCounts.outdoor_rinks = rinks.length;
    }

    // ── 4. PROGRAMS (streamed page-by-page, upserted in 500-row chunks) ───────
    const programsPkg = await fetchCkanPackage("registered-programs-and-drop-in-courses-offering");
    const programsResourceId = programsPkg?.resources?.find((r: any) =>
      r.datastore_active && r.name?.toLowerCase().includes("registered")
    )?.id;

    if (programsResourceId) {
      let programCount = 0;
      await streamCkanResource(programsResourceId, async (batch) => {
        const programs = batch.map((r: any) => {
          const { start_date, end_date } = parseFromTo(nullify(r["From To"]) ?? "");
          const minAge = nullify(r["Min Age"]);
          const maxAge = nullify(r["Max Age"]);
          return {
            course_id: Number(r["Course_ID"]),
            location_id: Number(r["Location ID"]),
            activity_type: inferActivityType(nullify(r["Program Category"]) ?? "", nullify(r["Activity Title"]) ?? ""),
            activity_title: nullify(r["Activity Title"]),
            course_title: nullify(r["Course Title"]),
            section: nullify(r["Section"]),
            days_of_week: parseDaysOfWeek(nullify(r["Days of The Week"]) ?? ""),
            start_date,
            end_date,
            start_time: parseTime(r["Start Hour"] ?? 0, r["Start Min"] ?? 0),
            end_time: parseTime(r["End Hour"] ?? 0, r["End Min"] ?? 0),
            min_age_months: minAge ? Number(minAge) : null,
            max_age_months: maxAge ? Number(maxAge) : null,
            registration_date: nullify(r["Registration Date"]),
            status: nullify(r["Status / Information"]),
            activity_url: nullify(r["Activity URL"]),
            program_category: nullify(r["Program Category"]),
            metadata: {},
          };
        });
        await batchUpsert(supabase, "programs", programs, UPSERT_CHUNK, "course_id");
        programCount += programs.length;
      });
      rowCounts.programs = programCount;
    }

    // ── 5. DROP-INS (streamed page-by-page) ───────────────────────────────────
    const dropinResourceId = programsPkg?.resources?.find((r: any) =>
      r.datastore_active && r.name?.toLowerCase().includes("drop")
    )?.id;

    if (dropinResourceId) {
      let dropinCount = 0;
      await streamCkanResource(dropinResourceId, async (batch) => {
        const dropins = batch.map((r: any) => {
          const courseId = nullify(r["Course_ID"]);
          const ageMin = nullify(r["Age Min"]);
          const ageMax = nullify(r["Age Max"]);
          return {
            course_id: courseId ? Number(courseId) : null,
            location_id: Number(r["Location ID"]),
            activity_type: inferActivityType("", nullify(r["Course Title"]) ?? ""),
            course_title: nullify(r["Course Title"]),
            section: nullify(r["Section"]),
            day_of_week: nullify(r["DayOftheWeek"]),
            first_date: nullify(r["First Date"]),
            last_date: nullify(r["Last Date"]),
            start_time: parseTime(r["Start Hour"] ?? 0, r["Start Minute"] ?? 0),
            end_time: parseTime(r["End Hour"] ?? 0, r["End Min"] ?? 0),
            min_age_months: ageMin ? Number(ageMin) * 12 : null,
            max_age_months: ageMax ? Number(ageMax) * 12 : null,
            metadata: {},
          };
        });
        // Deduplicate within this CKAN page by (course_id, location_id, first_date)
        // Some CKAN pages contain duplicate session rows; Postgres rejects intra-batch conflicts.
        const seen = new Set<string>();
        const dedupedDropins = dropins.filter((d) => {
          if (!d.course_id || !d.first_date) return true; // null course_id rows skip dedup
          const key = `${d.course_id}-${d.location_id}-${d.first_date}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        // Upsert on (course_id, location_id, first_date) — each session is uniquely identified
        // by its course, location, and date. Rows with null course_id are inserted fresh each run.
        await batchUpsert(supabase, "dropins", dedupedDropins, UPSERT_CHUNK, "course_id,location_id,first_date");
        dropinCount += dedupedDropins.length;
      });
      rowCounts.dropins = dropinCount;
    }

    // ── 6. FACILITIES ─────────────────────────────────────────────────────────
    const FACILITIES_RESOURCE_ID = "e16505dc-f106-4b58-a689-ed0a2b8b0b69";
    const rawFacilities = await fetchCkanResource(FACILITIES_RESOURCE_ID);

    // Filter to known location_ids to avoid FK violations
    const { data: knownLocations } = await supabase.from("locations").select("id");
    const knownLocationIds = new Set((knownLocations ?? []).map((l: any) => l.id));

    const facilities = rawFacilities
      .filter((r: any) => knownLocationIds.has(Number(r["Location ID"])))
      .map((r: any) => ({
        location_id: Number(r["Location ID"]),
        activity_type: inferActivityType(r["Facility Name"] ?? "", r["Section"] ?? ""),
        facility_name: r["Facility Name"] ?? null,
        section: r["Section"] ?? null,
        metadata: {
          course_id: r["Course_ID"] ?? null,
          raw: r,
        },
      }));

    if (facilities.length > 0) {
      for (let i = 0; i < facilities.length; i += UPSERT_CHUNK) {
        const chunk = facilities.slice(i, i + UPSERT_CHUNK);
        const { error } = await supabase.from("facilities").insert(chunk);
        if (error) throw new Error(`facilities insert (offset ${i}): ${error.message}`);
      }
    }
    rowCounts.facilities = facilities.length;
    rowCounts.facilities_skipped = rawFacilities.length - facilities.length;

    // ── 7. SEASON DETECTION ───────────────────────────────────────────────────
    // Fetch all distinct start_date + end_date combos from programs
    const { data: dateRanges } = await supabase
      .from("programs")
      .select("start_date, end_date")
      .not("start_date", "is", null)
      .not("end_date", "is", null);

    if (dateRanges && dateRanges.length > 0) {
      // Find the overall min start and max end
      const starts = dateRanges.map((r: any) => new Date(r.start_date));
      const ends = dateRanges.map((r: any) => new Date(r.end_date));
      const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
      const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));

      // Derive season label from start month
      const month = minStart.getMonth(); // 0-indexed
      let seasonLabel = "Winter";
      if (month >= 2 && month <= 4) seasonLabel = "Spring";
      else if (month >= 5 && month <= 7) seasonLabel = "Summer";
      else if (month >= 8 && month <= 10) seasonLabel = "Fall";

      const year = minStart.getFullYear();
      const seasonName = `${seasonLabel} ${year}`;

      const { data: existingSeason } = await supabase
        .from("seasons")
        .select("id, start_date, end_date")
        .eq("season_name", seasonName)
        .single();

      if (!existingSeason) {
        // New season detected — insert it
        await supabase.from("seasons").insert({
          season_name: seasonName,
          season_label: seasonLabel,
          start_date: minStart.toISOString().split("T")[0],
          end_date: maxEnd.toISOString().split("T")[0],
          is_current: true,
          notes: `Auto-detected from programs dataset on ${new Date().toISOString().split("T")[0]}`,
        });

        // Mark all other seasons as not current
        await supabase
          .from("seasons")
          .update({ is_current: false })
          .neq("season_name", seasonName);

        rowCounts.new_season_detected = 1;
        rowCounts.season_name = seasonName as any;
      } else {
        // Season exists — check if date range has shifted (seasonal change)
        const existingStart = existingSeason.start_date;
        const existingEnd = existingSeason.end_date;
        const newStart = minStart.toISOString().split("T")[0];
        const newEnd = maxEnd.toISOString().split("T")[0];

        if (existingStart !== newStart || existingEnd !== newEnd) {
          await supabase.from("seasons").update({
            start_date: newStart,
            end_date: newEnd,
            notes: `Date range updated on ${new Date().toISOString().split("T")[0]}`,
          }).eq("id", existingSeason.id);
          rowCounts.season_updated = 1;
        }

        rowCounts.season_name = seasonName as any;
      }

      // Backfill season_id on programs
      const { data: currentSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single();

      if (currentSeason) {
        await supabase
          .from("programs")
          .update({ season_id: currentSeason.id })
          .is("season_id", null);
        await supabase
          .from("dropins")
          .update({ season_id: currentSeason.id })
          .is("season_id", null);
      }
    }

    // ── 8. COORDINATES BACKFILL ───────────────────────────────────────────────
    // For all locations with raw_geometry, extract and set PostGIS coordinates
    const { data: geoLocations } = await supabase
      .from("locations")
      .select("id, raw_geometry")
      .not("raw_geometry", "is", null);

    if (geoLocations && geoLocations.length > 0) {
      let coordsUpdated = 0;
      for (const loc of geoLocations) {
        const geo = loc.raw_geometry as any;
        if (geo?.type === "Point" && Array.isArray(geo?.coordinates) && geo.coordinates.length === 2) {
          const [lng, lat] = geo.coordinates;
          if (typeof lng === "number" && typeof lat === "number") {
            const { error } = await supabase.rpc("set_location_coordinates", {
              loc_id: loc.id,
              lat,
              lng,
            });
            if (!error) coordsUpdated++;
          }
        }
      }
      rowCounts.coordinates_updated = coordsUpdated;
    }

    // ── Update sync log — success ─────────────────────────────────────────────
    await supabase.from("sync_log").update({
      status: "success",
      finished_at: new Date().toISOString(),
      rows_upserted: rowCounts,
    }).eq("id", logId);

    return new Response(JSON.stringify({ ok: true, rowCounts }), {
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
