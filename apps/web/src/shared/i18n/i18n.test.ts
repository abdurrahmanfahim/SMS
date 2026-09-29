import { afterEach, describe, expect, it } from "vitest";

import {
  getLocale,
  LOCALE_STORAGE_KEY,
  messageKeys,
  registerMessages,
  setLocale,
  t,
} from "./index";

afterEach(() => setLocale("bn"));

describe("i18n runtime", () => {
  it("defaults to Bangla and has the same keys in both languages", () => {
    expect(getLocale()).toBe("bn");
    expect(messageKeys("bn").sort()).toEqual(messageKeys("en").sort());
  });

  it("switches language and persists the choice", () => {
    setLocale("en");
    expect(t("shell.nav.home")).toBe("Home");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
    setLocale("bn");
    expect(t("shell.nav.home")).toBe("হোম");
  });

  it("interpolates params and leaves unknown placeholders", () => {
    registerMessages("bn", { "test.section.count": "{n} জন, {missing}" });
    expect(t("test.section.count", { n: 3 })).toBe("3 জন, {missing}");
  });

  it("falls back to the other language, then to the key", () => {
    registerMessages("en", { "test.section.onlyen": "Only English" });
    expect(t("test.section.onlyen")).toBe("Only English");
    expect(t("test.section.nothing")).toBe("test.section.nothing");
  });
});
