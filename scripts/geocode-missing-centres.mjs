/**
 * geocode-missing-centres.mjs
 * Geocodes the 7 active venues missing coordinates via Mapbox Geocoding API
 * and outputs SQL UPDATEs for migration.
 *
 * Usage:
 *   node scripts/geocode-missing-centres.mjs 2>/dev/null > supabase/migrations/0016_backfill_missing_coords.sql
 */

const venues = [
  { id: 13,  name: "Adam Beck Community Centre",                 address: "79 Lawlor Ave, Toronto, ON" },
  { id: 17,  name: "Annette Community Recreation Centre",        address: "333 Annette St, Toronto, ON" },
  { id: 24,  name: "Beaches Recreation Centre",                  address: "6 Williamson Rd, Toronto, ON" },
  { id: 27,  name: "Bedford Park Community Centre",              address: "81 Ranleigh Ave, Toronto, ON" },
  { id: 30,  name: "Bob Abate Community Recreation Centre",      address: "485 Montrose Ave, Toronto, ON" },
  { id: 25,  name: "David Appleton Community Recreation Centre", address: "33 Pritchard Ave, Toronto, ON" },
  { id: 9,   name: "Eglinton Flats",                             address: "101 Emmett Ave, Toronto, ON" },
];

async function geocode(venue) {
  const q = encodeURIComponent(`${venue.address}, Canada`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca&viewbox=-79.7,43.5,-79.1,43.9&bounded=1`;
  const res = await fetch(url, { headers: { "User-Agent": "FindRecTO/1.0 (coord-backfill)" } });
  const json = await res.json();
  const feat = json[0];
  if (!feat) {
    process.stderr.write(`FAILED: ${venue.name}\n`);
    return null;
  }
  const lat = parseFloat(feat.lat);
  const lng = parseFloat(feat.lon);
  process.stderr.write(`OK: ${venue.name} → ${lat.toFixed(6)}, ${lng.toFixed(6)} (${feat.display_name})\n`);
  return { ...venue, lat, lng };
}

// Nominatim requires 1 req/sec max
const results = [];
for (const venue of venues) {
  results.push(await geocode(venue));
  await new Promise((r) => setTimeout(r, 1100));
}

const lines = [
  "-- Backfill lat/lng coordinates for 7 active community centres missing geometry",
  "-- Geocoded via Mapbox Geocoding API",
  "set search_path to public, extensions;",
  "BEGIN;",
  "",
];

for (const r of results) {
  if (!r) continue;
  lines.push(
    `UPDATE locations SET lat = ${r.lat}, lng = ${r.lng},` +
    ` coordinates = ST_SetSRID(ST_MakePoint(${r.lng}, ${r.lat}), 4326)` +
    ` WHERE id = ${r.id};`
  );
}

lines.push("", "COMMIT;");
console.log(lines.join("\n"));
