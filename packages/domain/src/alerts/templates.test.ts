import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { countSegments } from "./segments.js";
import { renderTemplate, sanitizeText, templateVariables } from "./templates.js";

const ok = (r: ReturnType<typeof renderTemplate>) => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r;
};

describe("renderTemplate", () => {
  it("fills Bangla templates and lists the variables used", () => {
    const r = ok(
      renderTemplate("প্রিয় অভিভাবক, {student_name} আজ ({date}) অনুপস্থিত। {institution}", {
        student_name: "রহিম",
        date: "০৫/১০/২০২৬",
        institution: "আলো স্কুল",
      }),
    );
    expect(r.text).toBe("প্রিয় অভিভাবক, রহিম আজ (০৫/১০/২০২৬) অনুপস্থিত। আলো স্কুল");
    expect(r.variables).toEqual(["student_name", "date", "institution"]);
  });

  it("repeats a variable and reports it once", () => {
    const r = ok(renderTemplate("{amount} / {amount}", { amount: "৳ ১,৫০০" }));
    expect(r.text).toBe("৳ ১,৫০০ / ৳ ১,৫০০");
    expect(r.variables).toEqual(["amount"]);
  });

  it("supports literal braces with doubling", () => {
    expect(ok(renderTemplate("{{x}} and }}", {})).text).toBe("{x} and }");
    expect(ok(renderTemplate("no variables", {})).variables).toEqual([]);
  });

  it("does not expand placeholders that appear inside values", () => {
    const r = ok(renderTemplate("{student_name}", { student_name: "{link}", link: "http://x" }));
    expect(r.text).toBe("{link}");
  });

  it("reports unknown, missing and malformed placeholders together", () => {
    const r = renderTemplate("{student_name} {nope} {} {A} {a b} {open } lone}", { link: "x" });
    if (r.ok) throw new Error("expected errors");
    expect(r.errors).toEqual([
      { code: "missing_value", name: "student_name" },
      { code: "unknown_variable", name: "nope" },
      { code: "invalid_placeholder", name: "{}" },
      { code: "invalid_placeholder", name: "{A}" },
      { code: "invalid_placeholder", name: "{a b}" },
      { code: "invalid_placeholder", name: "{open }" },
      { code: "invalid_placeholder", name: "}" },
    ]);
  });

  it("reports an unclosed or nested brace as invalid", () => {
    const open = renderTemplate("hello {name", {});
    if (open.ok) throw new Error("expected errors");
    expect(open.errors).toEqual([{ code: "invalid_placeholder", name: "{name" }]);
    const nested = renderTemplate("{a{b}", {}, { allowed: ["a", "b"] });
    if (nested.ok) throw new Error("expected errors");
    expect(nested.errors[0]).toMatchObject({ code: "invalid_placeholder" });
  });

  it("uses the allowed list from options", () => {
    expect(ok(renderTemplate("{custom}", { custom: "v" }, { allowed: ["custom"] })).text).toBe("v");
    const r = renderTemplate("{student_name}", { student_name: "x" }, { allowed: ["custom"] });
    if (r.ok) throw new Error("expected errors");
    expect(r.errors).toEqual([{ code: "unknown_variable", name: "student_name" }]);
  });

  it("does not read inherited properties as values", () => {
    const r = renderTemplate("{amount}", {});
    expect(r.ok).toBe(false);
    const proto = renderTemplate(
      "{amount}",
      Object.create({ amount: "leak" }) as Record<string, string>,
    );
    expect(proto.ok).toBe(false);
  });

  it("keeps template newlines and turns value newlines into spaces", () => {
    const r = ok(renderTemplate("line1\r\nline2 {student_name}", { student_name: "a\nb\r\nc" }));
    expect(r.text).toBe("line1\nline2 a b c");
  });
});

describe("Bangla-safe output", () => {
  it("normalizes to NFC so vowel signs compose (shorter in UCS-2)", () => {
    const decomposed = "কে" + "\u09C7\u09BE"; // ক + e-kar, then e-kar + aa-kar (composes to o-kar)
    const s = sanitizeText(decomposed, true);
    expect(s).toBe("কে" + "\u09CB");
    expect(countSegments(s).units).toBeLessThan(countSegments(decomposed).units);
  });

  it("keeps the zero-width joiner and non-joiner used by Bangla conjuncts", () => {
    const text = "র\u200Dযা\u200Cক";
    expect(sanitizeText(text, false)).toBe(text);
  });

  it("removes hidden and directional characters and control codes", () => {
    const dirty = "a\u200Bb\u202Ec\u2066d\uFEFFe\u0007f\u007Fg\u0085h\u2028i\u2060j\u200Ek";
    expect(sanitizeText(dirty, false)).toBe("abcdefghijk");
    expect(sanitizeText("a\tb", false)).toBe("a\tb");
  });

  it("renders values through the same clean-up", () => {
    const r = ok(renderTemplate("{student_name}", { student_name: "রহিম\u202E\u200B" }));
    expect(r.text).toBe("রহিম");
  });

  it("property: output has no hidden characters and is stable under a second clean-up", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (text) => {
        const once = sanitizeText(text, true);
        expect(sanitizeText(once, true)).toBe(once);
        expect(once).not.toMatch(/[\u200B\u202A-\u202E\u2066-\u2069\uFEFF\r]/u);
      }),
    );
  });
});

describe("templateVariables", () => {
  it("lists distinct variable names in order of first use", () => {
    expect(templateVariables("{b} {a} {b} {{c}} {x y}")).toEqual(["b", "a"]);
    expect(templateVariables("nothing")).toEqual([]);
  });
});
