import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { scanDirectory } from "./check-bundle-secrets.mjs";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (role) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase", role })}.c2lnbmF0dXJlLXBsYWNlaG9sZGVy`;

function bundle(files) {
  const dir = mkdtempSync(join(tmpdir(), "bundle-"));
  mkdirSync(join(dir, "assets"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

test("a clean bundle, including a public anon JWT, passes", () => {
  const dir = bundle({ "index.html": "<html></html>", "assets/app.js": `const k="${jwt("anon")}";` });
  assert.deepEqual(scanDirectory(dir), []);
});

test("the text service_role is caught, in any case", () => {
  assert.equal(scanDirectory(bundle({ "assets/app.js": 'x="Service_Role"' })).length, 1);
});

test("a service-role JWT is caught even without the literal text", () => {
  const found = scanDirectory(bundle({ "assets/app.js": `k="${jwt("service_role")}"` }));
  assert.ok(found.some((p) => p.kind === "service-role JWT"));
});

test("the env var name and new-style secret keys are caught", () => {
  assert.equal(scanDirectory(bundle({ "a.js": "process.env.SUPABASE_SERVICE_ROLE_KEY" })).length, 1);
  assert.equal(scanDirectory(bundle({ "a.js": "k='sb_secret_Zk3v9QxLm2Pq8RtYw4NbC7dF'" })).length, 1);
});

test("the bare sb_secret_ prefix in library code is not a hit", () => {
  assert.deepEqual(scanDirectory(bundle({ "a.js": 'e.startsWith("sb_secret_")' })), []);
});

test("the CLI exits 1 on a hit and never prints the secret", () => {
  const secret = jwt("service_role");
  const dir = bundle({ "assets/app.js": `k="${secret}"` });
  const run = spawnSync("node", ["scripts/check-bundle-secrets.mjs", dir], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.doesNotMatch(run.stdout + run.stderr, new RegExp(secret.slice(20, 40)));
});

test("the CLI exits 0 on a clean bundle and 2 on an empty directory", () => {
  const ok = execFileSync("node", ["scripts/check-bundle-secrets.mjs", bundle({ "index.html": "<p>hi</p>" })], { encoding: "utf8" });
  assert.match(ok, /passed/);
  const empty = spawnSync("node", ["scripts/check-bundle-secrets.mjs", mkdtempSync(join(tmpdir(), "empty-"))]);
  assert.equal(empty.status, 2);
});
