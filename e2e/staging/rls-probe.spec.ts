import { expect, test } from "@playwright/test";

import { account, need, type Account } from "./env";

/**
 * Cross-tenant RLS probe against the real staging API. User A (single membership, school) signs
 * in through the Auth API and calls the REST API with A's own token; A must not see anything of
 * institution B (madrasa). B's id is learned by signing in as B's own user.
 */
async function token(baseUrl: string, anonKey: string, who: Account): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: who.email, password: who.password }),
  });
  expect(res.status, "sign-in through the Auth API").toBe(200);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function rest<T>(baseUrl: string, anonKey: string, jwt: string, path: string): Promise<T[]> {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${jwt}` },
  });
  expect(res.status, `GET ${path}`).toBe(200);
  return (await res.json()) as T[];
}

test.describe("RLS probe on staging", () => {
  const baseUrl = () => need("VITE_SUPABASE_URL").replace(/\/+$/, "");
  const anonKey = () => need("VITE_SUPABASE_ANON_KEY");

  test("user A cannot read institution B or its memberships", async () => {
    const url = baseUrl();
    const key = anonKey();
    const a = await token(url, key, account("SINGLE"));
    const b = await token(url, key, account("OTHER"));

    const bInstitutions = await rest<{ id: string; slug: string }>(url, key, b, "institutions?select=id,slug");
    expect(bInstitutions.map((i) => i.slug)).toEqual(["staging-madrasa"]);
    const bId = bInstitutions[0]?.id ?? "";

    const aInstitutions = await rest<{ id: string; slug: string }>(url, key, a, "institutions?select=id,slug");
    expect(aInstitutions.map((i) => i.slug)).toEqual(["staging-school"]);
    expect(await rest(url, key, a, `institutions?id=eq.${bId}&select=id`)).toEqual([]);
    expect(await rest(url, key, a, `memberships?institution_id=eq.${bId}&select=id`)).toEqual([]);

    const bProfiles = await rest<{ id: string }>(url, key, b, "profiles?select=id");
    expect(bProfiles).toHaveLength(1);
    expect(await rest(url, key, a, `profiles?id=eq.${bProfiles[0]?.id ?? ""}&select=id`)).toEqual([]);
  });

  test("a client cannot write tenancy tables, and anonymous requests are refused", async () => {
    const url = baseUrl();
    const key = anonKey();
    const a = await token(url, key, account("SINGLE"));

    const write = await fetch(`${url}/rest/v1/institutions`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${a}`, "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "probe-should-fail", name_en: "Probe" }),
    });
    expect([401, 403]).toContain(write.status);

    const anon = await fetch(`${url}/rest/v1/institutions?select=id`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    expect([401, 403]).toContain(anon.status);
  });
});
