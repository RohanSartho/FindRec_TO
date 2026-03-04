/**
 * fix-types.mjs — run via postinstall
 * Creates a stub index.d.ts for @types/mapbox__point-geometry when it's
 * installed without one (the package is a stub that ships no types file).
 */
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

const stubDir = join("node_modules", "@types", "mapbox__point-geometry");
const stubFile = join(stubDir, "index.d.ts");

if (existsSync(stubDir) && !existsSync(stubFile)) {
  writeFileSync(stubFile, "export {};\n");
  console.log("✓ Created stub index.d.ts for @types/mapbox__point-geometry");
}
