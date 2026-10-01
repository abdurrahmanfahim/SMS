/**
 * Copies text to the clipboard. Uses the Clipboard API on secure pages and falls back to a hidden
 * text field for older or restricted browsers. Returns whether the copy worked; never throws, so
 * the caller can show "copied" or "could not copy".
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or no focus: try the fallback below.
  }
  if (typeof document === "undefined") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.opacity = "0";
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
