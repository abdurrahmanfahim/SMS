import base from "@sms/config/eslint.config.js";

/** Floating-point APIs and literals are banned in the results engine: marks are integers. */
const noFloat = {
  files: ["src/results/**/*.ts"],
  // presets.ts is configuration data (spec §7 writes points such as 3.5); it is never used in arithmetic.
  ignores: ["src/results/**/*.test.ts", "src/results/presets.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[raw=/^\\d+\\.\\d/]",
        message:
          "Decimal number literals are not allowed in the results engine; use integers (hundredths).",
      },
      {
        selector: "CallExpression[callee.name='parseFloat']",
        message: "parseFloat is not allowed in the results engine.",
      },
      {
        selector:
          "MemberExpression[object.name='Math'][property.name=/^(round|floor|ceil|trunc|sqrt|pow|fround|random)$/]",
        message:
          "Floating-point Math functions are not allowed in the results engine; use bigint helpers.",
      },
      {
        selector: "MemberExpression[property.name='toFixed']",
        message: "toFixed is not allowed in the results engine.",
      },
    ],
  },
};

export default [...base, noFloat];
