/**
 * backfill-addresses.mjs
 *
 * Fetches all location records from the Toronto Open Data CKAN Locations
 * resource and generates a SQL migration that backfills the `address` and
 * `postal_code` columns for rows where those fields are currently NULL.
 *
 * The CKAN Locations resource stores address as split components:
 *   Street No, Street No Suffix, Street Name, Street Type, Street Direction
 * — NOT as a single "Address" field.  The current ingest was looking for
 * r["Address"] which never exists on these rows, so all non-rink venues
 * ended up with address = NULL.
 *
 * Usage (Node 18+, no extra deps):
 *   node scripts/backfill-addresses.mjs > supabase/migrations/0012_backfill_addresses.sql
 */

const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const LOCATIONS_RESOURCE_ID = "f23ac1ad-6f46-4b59-811f-eb34be9b1f7a";

/** Treat CKAN "None" / "" as null */
function clean(val) {
  if (val === "None" || val === "null" || val === "" || val == null) return null;
  return String(val).trim();
}

/** Build a normalized address string from component fields */
function buildAddress(rec) {
  const parts = [
    clean(rec["Street No"]),
    clean(rec["Street No Suffix"]),
    clean(rec["Street Name"]),
    clean(rec["Street Type"]),
    clean(rec["Street Direction"]),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Fetch all pages from a CKAN datastore resource */
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

/** Escape a SQL string literal (single-quote doubling) */
function sqlStr(val) {
  if (val === null) return "NULL";
  return `'${val.replace(/'/g, "''")}'`;
}

async function main() {
  process.stderr.write("Fetching CKAN locations resource…\n");
  const raw = await fetchAll(LOCATIONS_RESOURCE_ID);
  process.stderr.write(`Fetched ${raw.length} records.\n`);

  // Build update set — only rows that have at least a Street Name
  const updates = [];
  let withAddress = 0;
  let withPostal = 0;
  let noAddress = 0;

  for (const rec of raw) {
    const locationId = Number(rec["Location ID"]);
    if (!locationId) continue;

    const address = buildAddress(rec);
    const postalCode = clean(rec["Postal Code"]);

    if (!address && !postalCode) { noAddress++; continue; }
    if (address) withAddress++;
    if (postalCode) withPostal++;

    updates.push({ locationId, address, postalCode });
  }

  process.stderr.write(`Rows with address: ${withAddress}\n`);
  process.stderr.write(`Rows with postal code: ${withPostal}\n`);
  process.stderr.write(`Rows with neither (skipped): ${noAddress}\n`);
  process.stderr.write(`UPDATE statements to generate: ${updates.length}\n`);

  // Emit SQL
  const lines = [
    "-- Migration: 0012_backfill_addresses.sql",
    "-- Backfill address + postal_code for locations where CKAN has component",
    "-- fields (Street No / Street Name / Street Type / etc.) rather than a",
    "-- single 'Address' field.  Only updates rows that currently have NULL",
    "-- address to avoid overwriting data already set by rinks ingest or manual fix.",
    "--",
    `-- Generated ${new Date().toISOString()} from CKAN resource ${LOCATIONS_RESOURCE_ID}`,
    `-- Source records: ${raw.length}  |  Updates: ${updates.length}`,
    "",
    "set search_path to public, extensions;",
    "",
    "BEGIN;",
    "",
  ];

  for (const { locationId, address, postalCode } of updates) {
    const setClauses = [];
    if (address !== null) setClauses.push(`address = ${sqlStr(address)}`);
    if (postalCode !== null) setClauses.push(`postal_code = ${sqlStr(postalCode)}`);

    if (setClauses.length === 0) continue;

    // Only update where currently NULL so we don't overwrite rink-sourced addresses
    const whereClauses = [];
    if (address !== null) whereClauses.push("address IS NULL");
    else whereClauses.push("1=1"); // postal only — always safe to set

    lines.push(
      `UPDATE locations SET ${setClauses.join(", ")} WHERE id = ${locationId} AND (${whereClauses.join(" OR ")});`
    );
  }

  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  process.stdout.write(lines.join("\n"));
  process.stderr.write("Done. Pipe stdout to supabase/migrations/0012_backfill_addresses.sql\n");
}

main().catch((e) => { process.stderr.write(e.stack + "\n"); process.exit(1); });
