import { describe, expect, it } from "vitest";

import { fakeClient, SAMPLE } from "./fake-client";
import { createSessionStore, INSTITUTION_STORAGE_KEY, type StorageLike } from "./session";

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe("session store", () => {
  it("is unconfigured when there is no client", async () => {
    const store = createSessionStore(() => null, null);
    await store.start();
    expect(store.getState().status).toBe("unconfigured");
  });

  it("starts signed out with no persisted session", async () => {
    const store = createSessionStore(() => fakeClient(SAMPLE), null);
    await store.start();
    expect(store.getState().status).toBe("signed_out");
  });

  it("restores a persisted session (session persistence)", async () => {
    const client = fakeClient(SAMPLE);
    client.__setSession("u1");
    const store = createSessionStore(() => client, null);
    await store.start();
    const state = store.getState();
    expect(state.status === "signed_in" && state.fullName).toBe("Rahim");
  });

  it("a one-membership user gets their institution automatically", async () => {
    const store = createSessionStore(() => fakeClient(SAMPLE), memoryStorage());
    expect(await store.signIn("one@test.invalid", "pw-one")).toEqual({ ok: true });
    const state = store.getState();
    expect(state.status === "signed_in" && state.activeInstitutionId).toBe("i1");
    expect(state.status === "signed_in" && state.institutions[0]?.roles).toEqual([
      "institution_admin",
    ]);
  });

  it("a two-membership user must pick, and the pick is remembered", async () => {
    const storage = memoryStorage();
    const store = createSessionStore(() => fakeClient(SAMPLE), storage);
    await store.signIn("two@test.invalid", "pw-two");
    let state = store.getState();
    expect(state.status === "signed_in" && state.institutions).toHaveLength(2);
    expect(state.status === "signed_in" && state.activeInstitutionId).toBeNull();
    store.selectInstitution("i2");
    state = store.getState();
    expect(state.status === "signed_in" && state.activeInstitutionId).toBe("i2");
    expect(storage.map.get(INSTITUTION_STORAGE_KEY)).toBe("i2");
  });

  it("ignores an institution the user does not belong to", async () => {
    const store = createSessionStore(() => fakeClient(SAMPLE), memoryStorage());
    await store.signIn("one@test.invalid", "pw-one");
    store.selectInstitution("i2");
    const state = store.getState();
    expect(state.status === "signed_in" && state.activeInstitutionId).toBe("i1");
  });

  it("reports a wrong password as invalid and stays signed out", async () => {
    const store = createSessionStore(() => fakeClient(SAMPLE), null);
    await store.start();
    expect(await store.signIn("one@test.invalid", "nope")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(store.getState().status).toBe("signed_out");
  });

  it("signs the user out again if their data cannot be loaded", async () => {
    const store = createSessionStore(() => fakeClient(SAMPLE, { failLoad: true }), null);
    await store.start();
    expect(await store.signIn("one@test.invalid", "pw-one")).toEqual({
      ok: false,
      reason: "failed",
    });
    expect(store.getState().status).toBe("signed_out");
  });

  it("sign-out clears the state and the remembered institution", async () => {
    const storage = memoryStorage();
    const store = createSessionStore(() => fakeClient(SAMPLE), storage);
    await store.signIn("one@test.invalid", "pw-one");
    await store.signOut();
    expect(store.getState().status).toBe("signed_out");
    expect(storage.map.has(INSTITUTION_STORAGE_KEY)).toBe(false);
  });
});
