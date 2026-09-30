/** Escapes text for use inside a CSS string literal. */
export function cssString(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\A ")}"`;
}

/**
 * CSS that prints "Page 2 / 3" in the bottom margin of every page. It uses page margin boxes,
 * which Chromium supports from version 131; other browsers ignore the rule and print no number.
 */
export function pageNumberCss(label: string): string {
  return `@page { @bottom-center { content: ${cssString(`${label} `)} counter(page) " / " counter(pages); font-size: 9pt; } }`;
}
