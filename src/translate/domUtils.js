// AI Generated - DOM helpers for translate popup
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

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
