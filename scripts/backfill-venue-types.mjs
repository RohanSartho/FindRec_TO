/**
 * backfill-venue-types.mjs
 *
 * Fetches all facility records from CKAN and determines indoor/outdoor
 * classification for each location based on the following priority:
 *   1. Indoor Pool → "indoor"
 *   2. Outdoor Pool / Wading Pool → "outdoor"
 *   3. Weight/Cardio Room / Gymnasium / Craft Room / Fitness/Dance Studio → "indoor"
 *
 * Usage:
 *   node scripts/backfill-venue-types.mjs 2>/dev/null > supabase/migrations/0014_backfill_venue_types.sql
 */

const FACILITIES_RESOURCE_ID = "e16505dc-f106-4b58-a689-ed0a2b8b0b69";
const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca";
const PAGE_SIZE = 1000;

const INDOOR_POOL_TYPES = new Set(["Indoor Pool"]);
const OUTDOOR_POOL_TYPES = new Set(["Outdoor Pool", "Wading Pool", "Waterpark", "Splash Pad"]);
const INDOOR_FACILITY_TYPES = new Set([
  "Weight/Cardio Room",
  "Gymnasium",
  "Craft Room",
  "Fitness/Dance Studio",
  "Auditorium",
  "Indoor Tennis Court",
  "Indoor Squash Court",
  "Indoor Track",
  "Indoor Bocce Court",
  "Indoor Dry Pad",
  "Curling Rink",
  "Computer/Training Room",
  "Snoezelen Room",
  "Recording Studio",
  "Games Room",
  "Playroom",
]);

async function fetchAllFacilities() {
  const all = [];
  let offset = 0;
  while (true) {
    const url = `${CKAN_BASE}/api/3/action/datastore_search?resource_id=${FACILITIES_RESOURCE_ID}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url);
    const json = await res.json();
    const records = json.result?.records ?? [];
    all.push(...records);
    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

function classifyLocation(facilityTypes) {
  if (facilityTypes.some((t) => INDOOR_POOL_TYPES.has(t))) return "indoor";
  if (facilityTypes.some((t) => OUTDOOR_POOL_TYPES.has(t))) return "outdoor";
  if (facilityTypes.some((t) => INDOOR_FACILITY_TYPES.has(t))) return "indoor";
  return null;
}

const records = await fetchAllFacilities();
process.stderr.write(`Fetched ${records.length} CKAN facility records\n`);

// Group facility type display names by location_id
const byLocation = new Map();
for (const r of records) {
  const locId = Number(r["Location ID"]);
  const type = r["Facility Type (Display Name)"] ?? "";
  if (!locId || !type) continue;
  if (!byLocation.has(locId)) byLocation.set(locId, []);
  byLocation.get(locId).push(type);
}

process.stderr.write(`Locations with facility data: ${byLocation.size}\n`);

// Classify each location
const classified = [];
let indoor = 0, outdoor = 0, nulls = 0;
for (const [locId, types] of byLocation) {
  const vtype = classifyLocation(types);
  if (vtype === "indoor") indoor++;
  else if (vtype === "outdoor") outdoor++;
  else nulls++;
  if (vtype) classified.push({ locId, vtype });
}

process.stderr.write(`Results: ${indoor} indoor, ${outdoor} outdoor, ${nulls} unclassified\n`);

// Output SQL
const lines = [
  "-- Backfill venue_type on locations from CKAN facilities data",
  "-- Indoor Pool > Outdoor Pool/Wading > Weight/Gym/Craft/etc.",
  "set search_path to public, extensions;",
  "BEGIN;",
  "",
];

for (const { locId, vtype } of classified) {
  lines.push(`UPDATE locations SET venue_type = '${vtype}' WHERE id = ${locId} AND venue_type IS NULL;`);
}

lines.push("", "COMMIT;");
console.log(lines.join("\n"));
