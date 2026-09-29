import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { setLocale } from "../i18n";

import { asciiWhileTyping, cleanNumericText, parseNumericInput } from "./digits";
import {
  DateField,
  NumberField,
  PhoneField,
  SelectField,
  TextareaField,
  TextField,
} from "./fields";
import { Form, SubmitButton } from "./Form";
import { formError, parseFormError, translateFormError } from "./messages";
import {
  choiceField,
  dateField,
  numberField,
  optionalNumberField,
  optionalPhoneField,
  optionalText,
  phoneField,
  requiredText,
} from "./schema";
import { useAppForm } from "./useAppForm";

beforeEach(() => setLocale("bn"));
afterEach(cleanup);

const issues = (result: { success: boolean; error?: z.ZodError }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe("digits", () => {
  it("turns Bangla digits into ASCII while typing without changing length", () => {
    expect(asciiWhileTyping("১২৩.৫")).toBe("123.5");
    expect(asciiWhileTyping("১২৩.৫")).toHaveLength(5);
  });

  it("cleans spaces and grouping commas on blur", () => {
    expect(cleanNumericText(" ১,২৫০ .৫০ ")).toBe("1250.50");
  });

  it("parses numbers typed either way and rejects text", () => {
    expect(parseNumericInput("৯৮.৫")).toEqual({ ok: true, value: 98.5 });
    expect(parseNumericInput("98")).toEqual({ ok: true, value: 98 });
    expect(parseNumericInput("-5")).toEqual({ ok: true, value: -5 });
    expect(parseNumericInput("")).toEqual({ ok: false, reason: "empty" });
    expect(parseNumericInput("abc")).toEqual({ ok: false, reason: "invalid" });
    expect(parseNumericInput("1.2.3")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("messages", () => {
  it("round-trips a key with parameters", () => {
    const message = formError("forms.error.max", { max: 100 });
    expect(message).toBe("forms.error.max?max=100");
    expect(parseFormError(message)).toEqual({ key: "forms.error.max", params: { max: "100" } });
    expect(parseFormError("Too small")).toBeNull();
  });

  it("translates with the current language and formats numbers", () => {
    expect(translateFormError(formError("forms.error.max", { max: 100 }))).toBe(
      "১০০ এর বেশি হতে পারবে না।",
    );
    setLocale("en");
    expect(translateFormError(formError("forms.error.max", { max: 100 }))).toBe(
      "Must not be more than 100.",
    );
    expect(translateFormError(formError("forms.error.required"))).toBe("This field is required.");
  });

  it("never shows untranslated library text", () => {
    expect(translateFormError("Invalid input: expected string")).toBe("ঘরটি সঠিকভাবে পূরণ করুন।");
    expect(translateFormError(undefined)).toBeUndefined();
  });

  it("formats date limits", () => {
    setLocale("en");
    expect(translateFormError(formError("forms.error.dateMin", { min: "2026-01-05" }))).toMatch(
      /2026/,
    );
  });
});

describe("schema builders", () => {
  it("numberField accepts Bangla digits and outputs a number", () => {
    const schema = numberField({ min: 0, max: 100 });
    expect(schema.parse("৯৮.৫")).toBe(98.5);
    expect(schema.parse(" ১ ০ ")).toBe(10);
  });

  it("numberField reports required, invalid, range and integer errors as i18n keys", () => {
    const schema = numberField({ min: 0, max: 100, integer: true });
    expect(issues(schema.safeParse(""))).toEqual([formError("forms.error.required")]);
    expect(issues(schema.safeParse("abc"))).toEqual([formError("forms.error.invalidNumber")]);
    expect(issues(schema.safeParse("1.5"))).toEqual([formError("forms.error.integer")]);
    expect(issues(schema.safeParse("101"))).toEqual([formError("forms.error.max", { max: 100 })]);
    expect(issues(schema.safeParse("-1"))).toEqual([formError("forms.error.min", { min: 0 })]);
  });

  it("optionalNumberField allows empty", () => {
    expect(optionalNumberField().parse("")).toBeUndefined();
    expect(optionalNumberField().parse("৭")).toBe(7);
    expect(issues(optionalNumberField().safeParse("x"))).toEqual([
      formError("forms.error.invalidNumber"),
    ]);
  });

  it("phoneField outputs E.164 from Bangla or ASCII digits", () => {
    expect(phoneField().parse("০১৭১২-৩৪৫৬৭৮")).toBe("+8801712345678");
    expect(phoneField().parse("01712345678")).toBe("+8801712345678");
    expect(issues(phoneField().safeParse("0121234"))).toEqual([formError("forms.error.phone")]);
    expect(issues(phoneField().safeParse(""))).toEqual([formError("forms.error.required")]);
    expect(optionalPhoneField().parse("")).toBe("");
  });

  it("dateField checks calendar validity and limits", () => {
    const schema = dateField({ min: "2026-01-01", max: "2026-12-31" });
    expect(schema.parse("2026-09-29")).toBe("2026-09-29");
    expect(issues(schema.safeParse(""))).toEqual([formError("forms.error.required")]);
    expect(issues(schema.safeParse("2026-02-30"))).toEqual([formError("forms.error.date")]);
    expect(issues(schema.safeParse("2025-12-31"))).toEqual([
      formError("forms.error.dateMin", { min: "2026-01-01" }),
    ]);
    expect(issues(schema.safeParse("2027-01-01"))).toEqual([
      formError("forms.error.dateMax", { max: "2026-12-31" }),
    ]);
  });

  it("text and choice builders", () => {
    expect(requiredText({ max: 5 }).parse("  আলী ")).toBe("আলী");
    expect(issues(requiredText().safeParse("   "))).toEqual([formError("forms.error.required")]);
    expect(issues(requiredText({ max: 3 }).safeParse("চারটি"))).toEqual([
      formError("forms.error.tooLong", { max: 3 }),
    ]);
    expect(optionalText().parse(" ")).toBe("");
    expect(issues(choiceField().safeParse(""))).toEqual([formError("forms.error.choose")]);
  });
});

const schema = z.object({
  name: requiredText({ max: 40 }),
  marks: numberField({ min: 0, max: 100 }),
  phone: phoneField(),
  born: dateField({ max: "2026-12-31" }),
  section: choiceField(),
  note: optionalText(),
});

function Demo({ onSubmit }: { onSubmit: (values: unknown) => void | Promise<void> }) {
  const form = useAppForm(schema, {
    name: "",
    marks: "",
    phone: "",
    born: "",
    section: "",
    note: "",
  });
  return (
    <Form form={form} onSubmit={onSubmit} label="নমুনা">
      <TextField name="name" label="নাম" />
      <NumberField name="marks" label="নম্বর" />
      <PhoneField name="phone" label="মোবাইল" />
      <DateField name="born" label="জন্ম তারিখ" />
      <SelectField
        name="section"
        label="শাখা"
        placeholderOption="বেছে নিন"
        options={[
          { value: "ক", label: "ক" },
          { value: "খ", label: "খ" },
        ]}
      />
      <TextareaField name="note" label="মন্তব্য" optional />
      <SubmitButton>সংরক্ষণ করুন</SubmitButton>
    </Form>
  );
}

function fillValid() {
  fireEvent.change(screen.getByLabelText("নাম"), { target: { value: "রুবেল হোসেন" } });
  fireEvent.change(screen.getByLabelText("নম্বর"), { target: { value: "৯৮.৫" } });
  fireEvent.change(screen.getByLabelText("মোবাইল"), { target: { value: "০১৭১২-৩৪৫৬৭৮" } });
  fireEvent.change(screen.getByLabelText("জন্ম তারিখ"), { target: { value: "2012-05-04" } });
  fireEvent.change(screen.getByLabelText("শাখা"), { target: { value: "খ" } });
}

describe("form kit", () => {
  it("shows Bangla digits typed in numeric fields as ASCII and submits clean values", async () => {
    const onSubmit = vi.fn();
    render(<Demo onSubmit={onSubmit} />);
    fillValid();
    expect(screen.getByLabelText("নম্বর")).toHaveValue("98.5");
    expect(screen.getByLabelText("মোবাইল")).toHaveValue("01712-345678");
    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: "রুবেল হোসেন",
      marks: 98.5,
      phone: "+8801712345678",
      born: "2012-05-04",
      section: "খ",
      note: "",
    });
  });

  it("removes spaces and commas from a number when the field is left", () => {
    render(<Demo onSubmit={vi.fn()} />);
    const marks = screen.getByLabelText("নম্বর");
    fireEvent.change(marks, { target: { value: "১ ০০" } });
    fireEvent.blur(marks);
    expect(marks).toHaveValue("100");
  });

  it("shows translated inline errors, a summary, keeps typed values and focuses the first bad field", async () => {
    const onSubmit = vi.fn();
    render(<Demo onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("নাম"), { target: { value: "আলী" } });
    fireEvent.change(screen.getByLabelText("নম্বর"), { target: { value: "১২০" } });
    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    expect(await screen.findByText("১০০ এর বেশি হতে পারবে না।")).toBeInTheDocument();
    expect(screen.getAllByText("এই ঘরটি পূরণ করতে হবে।").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("form-error-summary")).toHaveTextContent("৪টি ঘরে সমস্যা আছে।");
    expect(screen.getByLabelText("নাম")).toHaveValue("আলী");
    expect(screen.getByLabelText("নম্বর")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("নম্বর")).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("marks optional fields", () => {
    render(<Demo onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("মন্তব্য (ঐচ্ছিক)")).toBeInTheDocument();
  });

  it("shows a translated failure and keeps values when saving throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network down"));
    render(<Demo onSubmit={onSubmit} />);
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "সংরক্ষণ করুন" }));
    expect(await screen.findByTestId("form-save-failed")).toHaveTextContent(
      "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
    );
    expect(screen.getByLabelText("নাম")).toHaveValue("রুবেল হোসেন");
    expect(screen.queryByText(/network down/)).toBeNull();
  });

  it("blocks a second submit while saving", async () => {
    let finish: () => void = () => undefined;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<Demo onSubmit={onSubmit} />);
    fillValid();
    const button = screen.getByRole("button", { name: "সংরক্ষণ করুন" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
  });

  it("uses numeric keypads and phone inputs on phones", () => {
    render(<Demo onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("নম্বর")).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByLabelText("মোবাইল")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("জন্ম তারিখ")).toHaveAttribute("type", "date");
  });
});
