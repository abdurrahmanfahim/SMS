#!/usr/bin/env node
// Fails when the built web bundle contains anything that looks like the Supabase service-role key.
//   node scripts/check-bundle-secrets.mjs [dir]      (default: apps/web/dist)
// Checks, in every text file under the directory:
//   1. the literal text "service_role" (any case), "SUPABASE_SERVICE_ROLE_KEY", or an sb_secret_ key value
//   2. any JWT whose payload says role = service_role (the legacy service key is such a JWT)
// It never prints the matched text itself, only the file and the kind of hit.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const TEXT_EXT = /\.(js|mjs|cjs|css|html|json|map|txt|webmanifest|svg|xml)$/i;
// `sb_secret_` alone is not a hit: supabase-js itself contains that prefix to tell key kinds apart.
// A real new-style secret key is the prefix followed by a long random value.
const FORBIDDEN = [/service_role/i, /SUPABASE_SERVICE_ROLE_KEY/, /sb_secret_[A-Za-z0-9_-]{20,}/];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT_EXT.test(name)) out.push(full);
  }
  return out;
}

function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
  } catch {
    return undefined;
  }
}

/** Returns [{ file, kind }] for every problem under `dir` (paths relative to `dir`). */
export function scanDirectory(dir) {
  const problems = [];
  for (const file of walk(dir)) {
    const text = readFileSync(file, "utf8");
    const rel = relative(dir, file);
    if (FORBIDDEN.some((re) => re.test(text))) problems.push({ file: rel, kind: "forbidden text" });
    for (const token of text.match(JWT) ?? []) {
      if (jwtRole(token) === "service_role") problems.push({ file: rel, kind: "service-role JWT" });
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? "apps/web/dist");
  let files = 0;
  try {
    files = walk(dir).length;
  } catch {
    console.error(`bundle check: cannot read ${dir}. Build first (pnpm build).`);
    process.exit(2);
  }
  if (files === 0) {
    console.error(`bundle check: no files found in ${dir}.`);
    process.exit(2);
  }
  const problems = scanDirectory(dir);
  if (problems.length > 0) {
    for (const p of problems) console.error(`bundle check FAILED: ${p.kind} in ${p.file}`);
    process.exit(1);
  }
  console.log(`bundle check passed: ${files} files scanned, no service-role key material.`);
}
