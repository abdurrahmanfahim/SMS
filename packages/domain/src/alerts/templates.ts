/** Options for {@link renderTemplate}. */
export type RenderOptions = {
  /**
   * Variable names a template may use. Defaults to the variables named in the spec (§4):
   * `student_name`, `date`, `amount`, `institution`, `link`.
   */
  readonly allowed?: readonly string[];
};

/** Variables the default template set may use (spec §4). */
export const DEFAULT_TEMPLATE_VARIABLES: readonly string[] = [
  "student_name",
  "date",
  "amount",
  "institution",
  "link",
];

/** Outcome of {@link renderTemplate}. */
export type RenderResult =
  | {
      readonly ok: true;
      readonly text: string;
      /** Distinct variables the template used, in order of first use. */
      readonly variables: readonly string[];
    }
  | { readonly ok: false; readonly errors: readonly RenderError[] };

/** One problem found in a template or its values. */
export type RenderError = {
  readonly code: "invalid_placeholder" | "unknown_variable" | "missing_value";
  /** The variable name, or the offending text for `invalid_placeholder`. */
  readonly name: string;
};

const NAME = /^[a-z][a-z0-9_]*$/;

type Token =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "invalid"; readonly text: string };

/**
 * Splits a template into text and `{variable}` tokens. `{{` and `}}` stand for literal braces. A
 * lone brace, an empty `{}` or a name that is not `[a-z][a-z0-9_]*` is an `invalid` token.
 */
function tokenize(body: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  const flush = (): void => {
    if (text !== "") tokens.push({ kind: "text", text });
    text = "";
  };
  let i = 0;
  while (i < body.length) {
    const ch = body.charAt(i);
    const next = body.charAt(i + 1);
    if (ch === "{" && next === "{") {
      text += "{";
      i += 2;
    } else if (ch === "}" && next === "}") {
      text += "}";
      i += 2;
    } else if (ch === "{") {
      const close = body.indexOf("}", i);
      const inner = close === -1 ? body.slice(i + 1) : body.slice(i + 1, close);
      flush();
      if (close === -1 || inner.includes("{") || !NAME.test(inner)) {
        tokens.push({ kind: "invalid", text: body.slice(i, close === -1 ? undefined : close + 1) });
        i = close === -1 ? body.length : close + 1;
      } else {
        tokens.push({ kind: "variable", name: inner });
        i = close + 1;
      }
    } else if (ch === "}") {
      flush();
      tokens.push({ kind: "invalid", text: "}" });
      i += 1;
    } else {
      text += ch;
      i += 1;
    }
  }
  flush();
  return tokens;
}

/** Names of the variables a template uses, in order of first use (no validation of the names). */
export function templateVariables(body: string): string[] {
  const names: string[] = [];
  for (const token of tokenize(body)) {
    if (token.kind === "variable" && !names.includes(token.name)) names.push(token.name);
  }
  return names;
}

// Invisible characters that can hide or reorder text in a message. The zero-width joiner and
// non-joiner (U+200D, U+200C) are deliberately kept: Bangla conjuncts need them. Tab and line
// feed are kept here (line feeds are handled separately by `sanitizeText`).
function isUnsafe(codePoint: number): boolean {
  return (
    codePoint <= 0x08 ||
    (codePoint >= 0x0b && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x200b ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2060 && codePoint <= 0x2064) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    codePoint === 0xfeff
  );
}

/**
 * Makes a text safe to send: Unicode NFC (Bangla vowel signs compose, so the text is shorter in
 * UCS-2), and control characters, zero-width spaces, line separators and bidi controls removed.
 * Zero-width joiner and non-joiner, which Bangla conjuncts use, are kept. Newlines are kept when
 * `keepNewlines` is true and become spaces otherwise.
 */
export function sanitizeText(text: string, keepNewlines: boolean): string {
  const lines = text.replace(/\r\n?|\n/g, keepNewlines ? "\n" : " ");
  return Array.from(lines)
    .filter((ch) => !isUnsafe(ch.codePointAt(0) as number))
    .join("")
    .normalize("NFC");
}

/**
 * Fills a text template (`text_templates.body_bn`) with values, in one pass, so a value that
 * itself contains `{something}` is never expanded again.
 *
 * Every `{name}` must be an allowed variable with a value; `{{` and `}}` give literal braces. All
 * problems are reported together: `invalid_placeholder`, `unknown_variable` (name not allowed) and
 * `missing_value`. Values are sanitized with {@link sanitizeText} (single line) and the finished
 * text is NFC normalized, so the result is safe to hand to `countSegments` and the provider.
 */
export function renderTemplate(
  body: string,
  values: Readonly<Record<string, string>>,
  options: RenderOptions = {},
): RenderResult {
  const allowed = options.allowed ?? DEFAULT_TEMPLATE_VARIABLES;
  const errors: RenderError[] = [];
  const variables: string[] = [];
  let text = "";
  for (const token of tokenize(body)) {
    if (token.kind === "text") {
      text += token.text;
    } else if (token.kind === "invalid") {
      errors.push({ code: "invalid_placeholder", name: token.text });
    } else if (!allowed.includes(token.name)) {
      errors.push({ code: "unknown_variable", name: token.name });
    } else if (!Object.hasOwn(values, token.name)) {
      errors.push({ code: "missing_value", name: token.name });
    } else {
      if (!variables.includes(token.name)) variables.push(token.name);
      text += sanitizeText(values[token.name] as string, false);
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, text: sanitizeText(text, true), variables };
}
