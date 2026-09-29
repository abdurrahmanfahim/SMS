// Tailwind preset for SMS. Every colour, radius, shadow, font size and breakpoint points at a
// CSS variable generated from docs/spec/design-tokens.json (see src/styles/tokens.css).
const v = (name) => `var(--${name})`;

const semantic = (name, keys) =>
  Object.fromEntries(keys.map((k) => [k === "base" ? "DEFAULT" : k, v(`color-${name}-${k}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    screens: { sm: "360px", md: "768px", lg: "1280px" },
    extend: {
      colors: {
        surface: semantic("surface", ["base", "subtle", "raised"]),
        content: { DEFAULT: v("color-text-primary"), secondary: v("color-text-secondary"), disabled: v("color-text-disabled"), inverse: v("color-text-inverse") },
        line: { DEFAULT: v("color-border-default"), strong: v("color-border-strong") },
        primary: semantic("primary", ["base", "hover", "fg"]),
        accent: semantic("accent", ["base", "hover", "fg"]),
        success: semantic("success", ["base", "fg"]),
        warning: semantic("warning", ["base", "fg"]),
        danger: semantic("danger", ["base", "fg"]),
        info: semantic("info", ["base", "fg"]),
        link: v("color-link-base"),
        ring: v("color-focus-ring-base"),
      },
      fontFamily: { sans: [v("font-bangla")] },
      fontSize: Object.fromEntries(
        ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].map((k) => [
          k,
          [v(`text-${k}`), { lineHeight: v(`text-${k}-leading`) }],
        ]),
      ),
      borderRadius: { sm: v("radius-sm"), md: v("radius-md"), lg: v("radius-lg"), full: v("radius-full") },
      boxShadow: { sm: v("shadow-sm"), md: v("shadow-md"), lg: v("shadow-lg") },
      transitionDuration: { fast: v("duration-fast"), base: v("duration-base"), slow: v("duration-slow") },
      transitionTimingFunction: { standard: v("ease-standard") },
      zIndex: { sticky: v("z-sticky-header"), dropdown: v("z-dropdown"), sheet: v("z-bottom-sheet"), modal: v("z-modal"), toast: v("z-toast"), tooltip: v("z-tooltip") },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
};
