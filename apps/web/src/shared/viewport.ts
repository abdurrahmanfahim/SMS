/**
 * On-screen keyboard handling, the fallback for browsers where `interactive-widget=resizes-content`
 * is missing or ignored (older Chrome, iOS Safari): the keyboard only shrinks the *visual*
 * viewport, so fixed bars must be lifted by the covered height.
 *
 * Keeps two things on <html>, read by packages/ui/src/styles/phone.css:
 *   --kb-inset            covered height in px (0 when the layout viewport already shrank)
 *   data-keyboard="open"  while an editable field has focus and the keyboard is up
 */

const KEYBOARD_MIN_PX = 120;

/** Pixels of the layout viewport covered by the keyboard (never negative). */
export function keyboardInset(
  layoutHeight: number,
  visualHeight: number,
  visualOffsetTop: number,
): number {
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualOffsetTop));
}

/**
 * The keyboard counts as open when an editable field is focused and the visible height is at
 * least 120px below the tallest height seen without a keyboard.
 */
export function isKeyboardOpen(
  baselineHeight: number,
  visualHeight: number,
  editableFocused: boolean,
): boolean {
  return editableFocused && baselineHeight - visualHeight >= KEYBOARD_MIN_PX;
}

export function isEditable(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLInputElement) {
    return ![
      "button",
      "checkbox",
      "radio",
      "submit",
      "reset",
      "file",
      "range",
      "color",
      "image",
    ].includes(element.type);
  }
  return element instanceof HTMLElement && element.isContentEditable === true;
}

/** Starts syncing; returns a function that stops it. Safe to call where visualViewport is missing. */
export function installViewportSync(win: Window = window, doc: Document = document): () => void {
  const vv = win.visualViewport;
  if (!vv) return () => undefined;
  const root = doc.documentElement;
  let baseline = Math.max(win.innerHeight, vv.height);

  function update() {
    const focused = isEditable(doc.activeElement);
    if (!focused) baseline = Math.max(win.innerHeight, vv!.height);
    root.style.setProperty(
      "--kb-inset",
      `${keyboardInset(win.innerHeight, vv!.height, vv!.offsetTop)}px`,
    );
    if (isKeyboardOpen(baseline, vv!.height, focused)) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;
  }

  function onFocusIn(event: FocusEvent) {
    if (!isEditable(event.target as Element | null)) return;
    // Let the keyboard animate, then bring the field into the clear area (scroll padding keeps it
    // out from under the sticky bars).
    win.setTimeout(() => {
      update();
      (event.target as HTMLElement).scrollIntoView({ block: "center", behavior: "auto" });
    }, 300);
  }

  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update);
  doc.addEventListener("focusin", onFocusIn);
  doc.addEventListener("focusout", () => win.setTimeout(update, 50));
  update();
  return () => {
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
    doc.removeEventListener("focusin", onFocusIn);
    delete root.dataset.keyboard;
    root.style.removeProperty("--kb-inset");
  };
}
