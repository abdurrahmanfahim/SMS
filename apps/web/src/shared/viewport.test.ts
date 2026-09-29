import { describe, expect, it } from "vitest";

import { installViewportSync, isEditable, isKeyboardOpen, keyboardInset } from "./viewport";

describe("keyboardInset", () => {
  it("is the height the keyboard covers", () => {
    expect(keyboardInset(800, 500, 0)).toBe(300);
  });
  it("is 0 when the layout viewport already shrank (resizes-content)", () => {
    expect(keyboardInset(500, 500, 0)).toBe(0);
  });
  it("subtracts the visual viewport offset and never goes negative", () => {
    expect(keyboardInset(800, 500, 100)).toBe(200);
    expect(keyboardInset(500, 520, 0)).toBe(0);
  });
});

describe("isKeyboardOpen", () => {
  it("needs a focused editable field and a large height drop", () => {
    expect(isKeyboardOpen(800, 480, true)).toBe(true);
    expect(isKeyboardOpen(800, 480, false)).toBe(false);
    expect(isKeyboardOpen(800, 760, true)).toBe(false);
  });
});

describe("isEditable", () => {
  it("recognises text fields but not buttons or checkboxes", () => {
    const text = document.createElement("input");
    const check = document.createElement("input");
    check.type = "checkbox";
    expect(isEditable(text)).toBe(true);
    expect(isEditable(document.createElement("textarea"))).toBe(true);
    expect(isEditable(check)).toBe(false);
    expect(isEditable(document.createElement("button"))).toBe(false);
    expect(isEditable(null)).toBe(false);
  });
});

describe("installViewportSync", () => {
  it("does nothing without visualViewport", () => {
    const win = { visualViewport: null } as unknown as Window;
    expect(installViewportSync(win, document)()).toBeUndefined();
  });

  it("sets --kb-inset and data-keyboard when the visual viewport shrinks under a focused field", () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 800,
      offsetTop: 0,
      addEventListener: (n: string, f: () => void) => (listeners[n] = f),
      removeEventListener: () => undefined,
    };
    const win = {
      innerHeight: 800,
      visualViewport: vv,
      setTimeout: window.setTimeout.bind(window),
    } as unknown as Window;
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const stop = installViewportSync(win, document);
    vv.height = 480;
    listeners["resize"]?.();
    expect(document.documentElement.style.getPropertyValue("--kb-inset")).toBe("320px");
    expect(document.documentElement.dataset.keyboard).toBe("open");
    stop();
    expect(document.documentElement.dataset.keyboard).toBeUndefined();
    input.remove();
  });
});
