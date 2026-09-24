import { describe, expect, it } from "vitest";

import { createSmsClient } from "./index";

describe("@sms/db", () => {
  it("createSmsClient throws a clear error when config is missing, rather than silently constructing a broken client", () => {
    // @ts-expect-error deliberately omitting required config to test the guard
    expect(() => createSmsClient({})).toThrow(/url and anonKey are required/);
  });

  it("createSmsClient returns a client when given a url and anon key", () => {
    const client = createSmsClient({ url: "http://127.0.0.1:54321", anonKey: "test-anon-key" });
    expect(client).toBeTruthy();
  });
});
