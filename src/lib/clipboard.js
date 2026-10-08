/** Copy from a user action, with a fallback for embedded browsers and HTTP pages. */
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some browser hosts expose the API but reject writes without a permission prompt.
    }
  }

  const activeElement = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) =>
        selection.getRangeAt(index).cloneRange(),
      )
    : [];
  const inputSelection =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
      ? {
          start: activeElement.selectionStart,
          end: activeElement.selectionEnd,
          direction: activeElement.selectionDirection,
        }
      : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.setAttribute("aria-label", "复制内容");
  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    padding: "0",
    border: "0",
    opacity: "0",
    fontSize: "16px",
    pointerEvents: "none",
  });
  // Keep focus inside the open dialog so its focus trap doesn't interrupt selection.
  const host = activeElement?.closest('[role="dialog"]') ?? document.body;
  host.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy is unavailable in this browser");
    }
  } finally {
    textarea.remove();
    activeElement?.focus({ preventScroll: true });
    if (inputSelection?.start !== null && inputSelection?.start !== undefined) {
      activeElement.setSelectionRange(
        inputSelection.start,
        inputSelection.end,
        inputSelection.direction,
      );
    } else if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}
