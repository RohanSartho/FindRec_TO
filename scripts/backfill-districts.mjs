/**
 * backfill-districts.mjs
 *
 * Fetches all location records from the Toronto Open Data CKAN Locations
 * resource and generates a SQL migration that backfills the `district` column
 * for rows where it is currently NULL.
 *
 * CKAN field used: "District" (the locations resource uses "District", not "Community Council Area")
 * Expected values: "Etobicoke York", "North York", "Scarborough", "Toronto and East York"
 *
 * Usage (Node 18+, no extra deps):
 *   node scripts/backfill-districts.mjs > supabase/migrations/0023_backfill_districts.sql
 */

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const LOCATIONS_RESOURCE_ID = "f23ac1ad-6f46-4b59-811f-eb34be9b1f7a";

function clean(val) {
  if (val === "None" || val === "null" || val === "" || val == null) return null;
  return String(val).trim();
}

async function fetchAll(resourceId) {
  const records = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const url = `${CKAN_BASE}/api/3/action/datastore_search?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    const json = await res.json();
    const batch = json?.result?.records ?? [];
    if (batch.length === 0) break;
    records.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return records;
}

function sqlStr(val) {
  if (val === null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

async function main() {
  process.stderr.write("Fetching CKAN locations resource…\n");
  const raw = await fetchAll(LOCATIONS_RESOURCE_ID);
  process.stderr.write(`Fetched ${raw.length} records.\n`);

  const updates = [];
  let withDistrict = 0;
  let noDistrict = 0;

  for (const rec of raw) {
    const locationId = Number(rec["Location ID"]);
    if (!locationId) continue;

    const district = clean(rec["District"]);
    if (!district) { noDistrict++; continue; }

    withDistrict++;
    updates.push({ locationId, district });
  }

  process.stderr.write(`Records with district: ${withDistrict}\n`);
  process.stderr.write(`Records without district (skipped): ${noDistrict}\n`);
  process.stderr.write(`UPDATE statements to generate: ${updates.length}\n`);

  const lines = [
    "set search_path to public, extensions;",
    "",
    `-- Backfill district from CKAN "District" field for locations where currently NULL.`,
    `-- Generated ${new Date().toISOString()} from CKAN resource ${LOCATIONS_RESOURCE_ID}`,
    `-- Source records: ${raw.length}  |  Updates: ${updates.length}`,
    "",
    "BEGIN;",
    "",
  ];

  for (const { locationId, district } of updates) {
    lines.push(
      `UPDATE locations SET district = ${sqlStr(district)} WHERE id = ${locationId} AND district IS NULL;`
    );
  }

  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  process.stdout.write(lines.join("\n"));
  process.stderr.write("Done. Pipe stdout to supabase/migrations/0023_backfill_districts.sql\n");
}

main().catch((e) => { process.stderr.write(e.stack + "\n"); process.exit(1); });
