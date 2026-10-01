#!/usr/bin/env node
// Seeds the STAGING Supabase project: 2 institutions, 3 synthetic users (one with two memberships).
// Run by the Owner from their own machine, never in CI:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm seed:staging
// Passwords are random, generated here, printed ONCE to the terminal and never written anywhere.
// Safe to run again: existing rows and users are kept, and existing users' passwords are unchanged.
import { buildSeedPlan, generatePassword } from "./seed-staging-lib.mjs";

const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell (not in a file in the repo).");
  process.exit(2);
}
const plan = buildSeedPlan(process.env.SEED_EMAIL_DOMAIN || "example.com");
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

console.log(`Seeding ${new URL(url).host} ...`);

// 1. Institutions (unique on slug).
const instRows = await call("/rest/v1/institutions?on_conflict=slug", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify(plan.institutions),
});
const instIdBySlug = new Map(instRows.map((r) => [r.slug, r.id]));

// 2. Users, profiles, memberships.
const existing = await call("/auth/v1/admin/users?per_page=200");
const byEmail = new Map((existing.users ?? []).map((u) => [u.email, u]));
const credentials = [];
for (const user of plan.users) {
  let authUser = byEmail.get(user.email);
  if (authUser) {
    credentials.push({ email: user.email, password: "(already exists, password unchanged)" });
  } else {
    const password = generatePassword();
    authUser = await call("/auth/v1/admin/users", {
      method: "POST",
      body: JSON.stringify({ email: user.email, password, email_confirm: true }),
    });
    credentials.push({ email: user.email, password });
  }
  await call("/rest/v1/profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: authUser.id, full_name: user.full_name }),
  });
  await call("/rest/v1/memberships?on_conflict=institution_id,profile_id,role", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify(
      user.memberships.map((m) => ({
        institution_id: instIdBySlug.get(m.institution),
        profile_id: authUser.id,
        role: m.role,
        status: "active",
      })),
    ),
  });
}

console.log("\nSave these in your password manager NOW. They are not stored anywhere and are shown only once.\n");
for (const c of credentials) console.log(`${c.email}\t${c.password}`);
console.log("\nDone.");
