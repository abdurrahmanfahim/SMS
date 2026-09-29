import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Hex, snapshotChecksum, verifySnapshot } from "./snapshot.js";

describe("canonicalJson", () => {
  it("sorts keys, removes whitespace and drops undefined values", () => {
    expect(canonicalJson({ b: 1, a: { d: [3, { z: null, y: true }], c: "x" }, u: undefined })).toBe(
      '{"a":{"c":"x","d":[3,{"y":true,"z":null}]},"b":1}',
    );
  });

  it("gives the same text whatever the key order", () => {
    expect(canonicalJson({ x: 1, y: 2 })).toBe(canonicalJson({ y: 2, x: 1 }));
  });

  it("escapes strings like JSON and keeps Bangla text", () => {
    expect(canonicalJson({ 'k"': "a\nb", bn: "অসাধারণ" })).toBe('{"bn":"অসাধারণ","k\\"":"a\\nb"}');
  });

  it("writes undefined array items as null", () => {
    expect(canonicalJson([1, undefined as never, 2])).toBe("[1,null,2]");
  });

  it("throws a TypeError for values JSON cannot hold", () => {
    expect(() => canonicalJson(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalJson(Infinity)).toThrow(TypeError);
    expect(() => canonicalJson(10n as never)).toThrow(TypeError);
    expect(() => canonicalJson(undefined as never)).toThrow(TypeError);
  });
});

describe("checksums", () => {
  it("computes SHA-256 with Web Crypto (known vectors)", async () => {
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is stable for the same content and changes when anything changes", async () => {
    const content = { rules: { v: 1 }, rows: [{ a: 1 }, { a: 2 }] };
    const first = await snapshotChecksum(content);
    expect(await snapshotChecksum({ rows: [{ a: 1 }, { a: 2 }], rules: { v: 1 } })).toBe(first);
    expect(await snapshotChecksum({ ...content, rows: [{ a: 1 }, { a: 3 }] })).not.toBe(first);
  });

  it("verifies a snapshot against a stored checksum", async () => {
    const content = { rules: { v: 1 }, rows: [] };
    const sum = await snapshotChecksum(content);
    expect(await verifySnapshot(content, sum)).toBe(true);
    expect(await verifySnapshot(content, sum.toUpperCase())).toBe(true);
    expect(await verifySnapshot({ ...content, rules: { v: 2 } }, sum)).toBe(false);
  });
});
