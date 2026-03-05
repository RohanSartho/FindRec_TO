/**
 * geocode-all-missing-coords.mjs
 *
 * Paginates through ALL dropins + programs rows to collect every active
 * location_id, then geocodes only the ones with lat IS NULL via Nominatim.
 *
 * Usage:
 *   node scripts/geocode-all-missing-coords.mjs 2>/dev/null \
 *     > supabase/migrations/0018_backfill_missing_coords.sql
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function sbFetch(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Paginate through a table to collect all distinct location_ids */
async function allLocationIds(supabaseUrl, key, table) {
  const ids = new Set();
  const PAGE = 1000;
  let offset = 0;
  process.stderr.write(`  Paginating ${table}…`);
  while (true) {
    const rows = await sbFetch(
      supabaseUrl, key,
      `${table}?select=location_id&location_id=not.is.null&limit=${PAGE}&offset=${offset}`
    );
    if (!rows.length) break;
    for (const r of rows) if (r.location_id) ids.add(r.location_id);
    process.stderr.write(` ${offset + rows.length}`);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  process.stderr.write(` → ${ids.size} unique ids\n`);
  return ids;
}

async function geocode(id, name, address) {
  const q = encodeURIComponent(
    address.includes("Toronto") ? `${address}, Canada` : `${address}, Toronto, ON, Canada`
  );
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca&viewbox=-79.7,43.5,-79.1,43.9&bounded=1`;
  const res = await fetch(url, { headers: { "User-Agent": "FindRecTO/1.0 (coord-backfill)" } });
  if (!res.ok) { process.stderr.write(`  HTTP ${res.status}: ${name}\n`); return null; }
  const json = await res.json();
  const feat = json[0];
  if (!feat) { process.stderr.write(`  MISS: [${id}] ${name}\n`); return null; }
  const lat = parseFloat(feat.lat);
  const lng = parseFloat(feat.lon);
  process.stderr.write(`  OK  : [${id}] ${name} → ${lat.toFixed(5)}, ${lng.toFixed(5)}\n`);
  return { id, lat, lng };
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env["NEXT_PUBLIC_SUPABASE_URL"];
  const key         = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !key) { process.stderr.write("ERROR: missing env vars\n"); process.exit(1); }

  // ── Step 1: collect ALL active location IDs ──────────────────────────────
  process.stderr.write("Step 1: Collecting all active location IDs…\n");
  const [dropinIds, programIds] = await Promise.all([
    allLocationIds(supabaseUrl, key, "dropins"),
    allLocationIds(supabaseUrl, key, "programs"),
  ]);
  const activeIds = new Set([...dropinIds, ...programIds]);
  process.stderr.write(`  Combined: ${activeIds.size} unique active locations\n`);

  // ── Step 2: find which of those are missing lat ──────────────────────────
  process.stderr.write("\nStep 2: Finding active venues with lat IS NULL…\n");
  // Fetch in chunks of 500 because the id=in.(...) list can be long
  const idArr = Array.from(activeIds);
  const CHUNK = 400;
  const missing = [];
  for (let i = 0; i < idArr.length; i += CHUNK) {
    const chunk = idArr.slice(i, i + CHUNK).join(",");
    const rows = await sbFetch(
      supabaseUrl, key,
      `locations?select=id,name,address&lat=is.null&address=not.is.null&id=in.(${chunk})&order=name`
    );
    missing.push(...rows);
  }
  process.stderr.write(`  ${missing.length} active venues need coordinates\n`);

  if (missing.length === 0) {
    process.stderr.write("All active venues already have coordinates. Nothing to do.\n");
    return;
  }

  missing.forEach((v) => process.stderr.write(`    [${v.id}] ${v.name} | ${v.address}\n`));

  // ── Step 3: geocode ──────────────────────────────────────────────────────
  process.stderr.write(`\nStep 3: Geocoding ${missing.length} venues via Nominatim (~${missing.length}s)…\n`);
  const results = [];
  let ok = 0, miss = 0;
  for (let i = 0; i < missing.length; i++) {
    process.stderr.write(`[${i + 1}/${missing.length}] `);
    const r = await geocode(missing[i].id, missing[i].name, missing[i].address);
    if (r) { results.push(r); ok++; } else { miss++; }
    if (i < missing.length - 1) await new Promise((r) => setTimeout(r, 1100));
  }
  process.stderr.write(`\n${ok} geocoded, ${miss} not found.\n`);

  // ── Step 4: emit SQL ─────────────────────────────────────────────────────
  const lines = [
    "-- Migration: 0018_backfill_missing_coords.sql",
    `-- Backfill lat/lng + PostGIS coordinates for ${ok} active venues previously missing geometry`,
    `-- Only covers venues that appear in dropins or programs tables`,
    `-- Generated ${new Date().toISOString()} via Nominatim geocoding`,
    `-- Input: ${missing.length} active venues with lat IS NULL | Geocoded: ${ok} | Not found: ${miss}`,
    "",
    "set search_path to public, extensions;",
    "",
    "BEGIN;",
    "",
  ];
  for (const { id, lat, lng } of results) {
    lines.push(
      `UPDATE locations SET lat = ${lat}, lng = ${lng},` +
      ` coordinates = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)` +
      ` WHERE id = ${id} AND lat IS NULL;`
    );
  }
  lines.push("", "COMMIT;", "");
  process.stdout.write(lines.join("\n"));
  process.stderr.write(`Done. Pipe stdout → supabase/migrations/0018_backfill_missing_coords.sql\n`);
}

main().catch((e) => { process.stderr.write(e.stack + "\n"); process.exit(1); });
