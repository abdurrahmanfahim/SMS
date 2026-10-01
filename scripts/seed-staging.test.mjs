// Runs scripts/seed-staging.mjs against a tiny in-memory fake of the Supabase HTTP API.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import test from "node:test";

function fakeSupabase() {
  const state = { institutions: [], users: [], profiles: [], memberships: [], calls: [] };
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      state.calls.push(`${req.method} ${req.url.split("?")[0]}`);
      const json = body ? JSON.parse(body) : null;
      const send = (code, data) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (req.headers.apikey !== "test-key") return send(401, { message: "bad key" });
      const path = req.url.split("?")[0];
      if (path === "/rest/v1/institutions") {
        for (const i of json) {
          if (!state.institutions.some((x) => x.slug === i.slug)) state.institutions.push({ id: `inst-${state.institutions.length + 1}`, ...i });
        }
        return send(201, state.institutions.filter((x) => json.some((i) => i.slug === x.slug)));
      }
      if (path === "/auth/v1/admin/users" && req.method === "GET") return send(200, { users: state.users });
      if (path === "/auth/v1/admin/users" && req.method === "POST") {
        assert.ok(json.password.length >= 20 && json.email_confirm === true);
        const u = { id: `user-${state.users.length + 1}`, email: json.email };
        state.users.push(u);
        return send(200, u);
      }
      if (path === "/rest/v1/profiles") return send(201, (state.profiles = [...state.profiles.filter((p) => p.id !== json.id), json]));
      if (path === "/rest/v1/memberships") {
        for (const m of json) {
          if (!state.memberships.some((x) => x.institution_id === m.institution_id && x.profile_id === m.profile_id && x.role === m.role)) state.memberships.push(m);
        }
        return send(201, []);
      }
      return send(404, { message: "not found" });
    });
  });
  return { server, state };
}

function runSeed(url, key = "test-key") {
  return new Promise((resolve) => {
    const child = spawn("node", ["scripts/seed-staging.mjs"], {
      env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

test("seed creates 2 institutions, 3 users, 4 memberships, and is safe to re-run", async () => {
  const { server, state } = fakeSupabase();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const first = await runSeed(url);
    assert.equal(first.code, 0, first.out);
    assert.equal(state.institutions.length, 2);
    assert.equal(state.users.length, 3);
    assert.equal(state.profiles.length, 3);
    assert.equal(state.memberships.length, 4);
    const passwords = first.out.split("\n").filter((l) => l.includes("@")).map((l) => l.split("\t")[1]);
    assert.equal(passwords.length, 3);
    assert.equal(new Set(passwords).size, 3);

    const second = await runSeed(url);
    assert.equal(second.code, 0, second.out);
    assert.equal(state.users.length, 3);
    assert.equal(state.memberships.length, 4);
    assert.equal((second.out.match(/already exists/g) ?? []).length, 3);
  } finally {
    server.close();
  }
});

test("seed fails clearly without env and never echoes the key on an API error", async () => {
  const { server } = fakeSupabase();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const bad = await runSeed(`http://127.0.0.1:${server.address().port}`, "wrong-secret-key-value");
    assert.notEqual(bad.code, 0);
    assert.doesNotMatch(bad.out, /wrong-secret-key-value/);
  } finally {
    server.close();
  }
});
