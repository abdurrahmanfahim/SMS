import { describe, expect, it } from "vitest";

import { ping } from "./index";

describe("@sms/domain placeholder", () => {
  it("ping returns pong", () => {
    expect(ping()).toBe("pong");
  });
});
