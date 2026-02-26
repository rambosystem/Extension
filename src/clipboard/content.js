import { showClipboardPopup } from "./popup.js";

let lastFocusedEditable = null;

function isEditable(el) {
  if (!el || !el.tagName) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el.isContentEditable === true;
}

function insertTextAtCursor(el, text) {
  if (!el || !text) return;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (el.isContentEditable) {
    document.execCommand("insertText", false, text);
  }
}

function getPasteTarget() {
  const active = document.activeElement;
  if (active && isEditable(active)) return active;
  if (lastFocusedEditable?.isConnected && isEditable(lastFocusedEditable)) return lastFocusedEditable;
  return null;
}

document.addEventListener("focusin", (e) => {
  if (isEditable(e.target)) lastFocusedEditable = e.target;
}, true);

document.addEventListener("clipboard-paste-to-focused", (e) => {
  const text = e.detail?.text;
  if (typeof text !== "string") return;
  const el = getPasteTarget();
  if (el) insertTextAtCursor(el, text);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showClipboardPopup") {
    showClipboardPopup();
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === "pasteToLastFocused" && typeof request.text === "string") {
    const el = getPasteTarget();
    if (el) {
      insertTextAtCursor(el, request.text);
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false });
    }
    return true;
  }
  return true;
});
