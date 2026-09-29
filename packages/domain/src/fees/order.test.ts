import { describe, expect, it } from "vitest";

import { compareIds } from "./order.js";

describe("compareIds", () => {
  it("orders by code unit and returns 0 for equal strings", () => {
    expect(compareIds("a", "b")).toBe(-1);
    expect(compareIds("b", "a")).toBe(1);
    expect(compareIds("a", "a")).toBe(0);
    expect(["b", "B", "a"].sort(compareIds)).toEqual(["B", "a", "b"]);
  });
});
