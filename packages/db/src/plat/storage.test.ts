import { describe, expect, it } from "vitest";

import type { SmsClient } from "../client";

import {
  createSignedUrl,
  DEFAULT_SIGNED_URL_SECONDS,
  MAX_SIGNED_URL_SECONDS,
  signedUrlLifetime,
  storagePath,
  STORAGE_BUCKETS,
} from "./storage";

const INST = "0b6f1c2e-3d4a-4b5c-8d6e-7f8091a2b3c4";

describe("storagePath", () => {
  it("puts the institution first and joins the segments", () => {
    expect(storagePath(INST, "students", "p1.jpg")).toBe(`${INST}/students/p1.jpg`);
  });
  it("lower-cases the institution id", () => {
    expect(storagePath(INST.toUpperCase(), "logo.png")).toBe(`${INST}/logo.png`);
  });
  it("rejects an institution id that is not a uuid", () => {
    expect(() => storagePath("../other", "x.png")).toThrow("UUID");
    expect(() => storagePath("", "x.png")).toThrow("UUID");
  });
  it("needs at least one segment", () => {
    expect(() => storagePath(INST)).toThrow("at least one");
  });
  it("rejects segments that could leave the institution folder", () => {
    for (const bad of ["", ".", "..", "a/b", "/abs"]) {
      expect(() => storagePath(INST, bad)).toThrow("Invalid path segment");
    }
  });
});

describe("signedUrlLifetime", () => {
  it("defaults to 60 seconds", () => {
    expect(signedUrlLifetime()).toBe(DEFAULT_SIGNED_URL_SECONDS);
    expect(DEFAULT_SIGNED_URL_SECONDS).toBe(60);
  });
  it("caps at five minutes and floors to whole seconds, minimum 1", () => {
    expect(signedUrlLifetime(86_400)).toBe(MAX_SIGNED_URL_SECONDS);
    expect(signedUrlLifetime(90.9)).toBe(90);
    expect(signedUrlLifetime(0)).toBe(1);
    expect(signedUrlLifetime(-5)).toBe(1);
  });
  it("falls back to the default for NaN and infinity", () => {
    expect(signedUrlLifetime(Number.NaN)).toBe(DEFAULT_SIGNED_URL_SECONDS);
    expect(signedUrlLifetime(Number.POSITIVE_INFINITY)).toBe(DEFAULT_SIGNED_URL_SECONDS);
  });
});

function fakeClient(result: {
  data: { signedUrl: string } | null;
  error: { message: string } | null;
}) {
  const calls: { bucket: string; path: string; seconds: number }[] = [];
  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: (path: string, seconds: number) => {
          calls.push({ bucket, path, seconds });
          return Promise.resolve(result);
        },
      }),
    },
  } as unknown as SmsClient;
  return { client, calls };
}

describe("createSignedUrl", () => {
  it("asks for a clamped lifetime and returns the url", async () => {
    const { client, calls } = fakeClient({
      data: { signedUrl: "https://x.test/s?t=1" },
      error: null,
    });
    const result = await createSignedUrl(client, "logos", `${INST}/logo.png`, 10_000);
    expect(result).toEqual({ ok: true, url: "https://x.test/s?t=1", expiresInSeconds: 300 });
    expect(calls).toEqual([{ bucket: "logos", path: `${INST}/logo.png`, seconds: 300 }]);
  });
  it("uses the default lifetime when none is given", async () => {
    const { client, calls } = fakeClient({ data: { signedUrl: "u" }, error: null });
    await createSignedUrl(client, "photos", `${INST}/a.jpg`);
    expect(calls[0]?.seconds).toBe(60);
  });
  it("returns the storage error message without throwing", async () => {
    const { client } = fakeClient({ data: null, error: { message: "Object not found" } });
    expect(await createSignedUrl(client, "exports", `${INST}/x.pdf`)).toEqual({
      ok: false,
      message: "Object not found",
    });
  });
  it("returns a generic message when there is neither data nor error", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await createSignedUrl(client, "imports", `${INST}/x.csv`)).toEqual({
      ok: false,
      message: "Could not create a signed URL",
    });
  });
});

describe("STORAGE_BUCKETS", () => {
  it("lists the four private buckets", () => {
    expect([...STORAGE_BUCKETS]).toEqual(["logos", "photos", "imports", "exports"]);
  });
});
