import assert from "node:assert/strict";
import test from "node:test";

import { buildSeedPlan, generatePassword } from "./seed-staging-lib.mjs";

test("generatePassword: right length, safe alphabet, not repeated", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const p = generatePassword();
    assert.equal(p.length, 20);
    assert.match(p, /^[a-zA-Z2-9]+$/);
    assert.doesNotMatch(p, /[0OIl1]/);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});

test("buildSeedPlan: 2 institutions, 3 users, exactly one user with two memberships", () => {
  const plan = buildSeedPlan();
  assert.equal(plan.institutions.length, 2);
  assert.equal(plan.users.length, 3);
  assert.deepEqual(plan.users.map((u) => u.memberships.length).sort(), [1, 1, 2]);
  const slugs = new Set(plan.institutions.map((i) => i.slug));
  for (const u of plan.users) for (const m of u.memberships) assert.ok(slugs.has(m.institution));
  for (const i of plan.institutions) assert.match(i.slug, /^[a-z0-9-]{3,40}$/);
});

test("buildSeedPlan: contains no password or key material", () => {
  assert.doesNotMatch(JSON.stringify(buildSeedPlan()), /password|secret|key|token/i);
});
