// AI Generated - DOM helpers for translate popup (content script)

/**
 * @returns {DOMRect | null} Selection bounding rect or null
 */
export function getSelectionRect() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  try {
    return range.getBoundingClientRect();
  } catch (_) {
    return null;
  }
}

/**
 * @param {string} str
 * @returns {string} HTML-escaped string
 */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
