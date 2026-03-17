import { showFavoritesPopup } from "./popup.js";

let lastFocusedEditable = null;

function isEditable(el) {
  if (!el || !el.tagName) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el.isContentEditable === true;
}

function isInsidePenrosePopup(el) {
  if (!el?.closest) return false;
  return !!el.closest("#penrose-translate-popup, #penrose-clipboard-popup");
}

function focusEditable(el) {
  if (!el || typeof el.focus !== "function") return;
  try {
    el.focus({ preventScroll: true });
  } catch (_) {
    el.focus();
  }
}

function addLeadingSpaceIfNeeded(text, hasTextBefore, prevChar) {
  if (!text) return text;
  if (!hasTextBefore) return text;
  if (/^\s/.test(text)) return text;
  if (!prevChar || /\s/.test(prevChar)) return text;
  return ` ${text}`;
}

function getLastTextChar(node) {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue || "";
    return value ? value.slice(-1) : "";
  }
  let cur = node.lastChild;
  while (cur) {
    const ch = getLastTextChar(cur);
    if (ch) return ch;
    cur = cur.previousSibling;
  }
  return "";
}

function getPreviousCharInContentEditable(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return "";

  const node = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.nodeValue || "";
    if (offset > 0 && value) {
      return value.slice(offset - 1, offset);
    }
  }
  if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
    const prevSibling = node.childNodes[offset - 1];
    const ch = getLastTextChar(prevSibling);
    if (ch) return ch;
  }

  let cur = node;
  while (cur && cur !== root) {
    let prev = cur.previousSibling;
    while (prev) {
      const ch = getLastTextChar(prev);
      if (ch) return ch;
      prev = prev.previousSibling;
    }
    cur = cur.parentNode;
  }
  return "";
}

function insertTextAtCursor(el, text) {
  if (!el || !text) return;
  focusEditable(el);
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const textToInsert = addLeadingSpaceIfNeeded(
      text,
      before.trim().length > 0,
      before.slice(-1),
    );
    el.value = before + textToInsert + after;
    el.selectionStart = el.selectionEnd = start + textToInsert.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (el.isContentEditable) {
    const prevChar = getPreviousCharInContentEditable(el);
    const textToInsert = addLeadingSpaceIfNeeded(text, !!prevChar, prevChar);
    document.execCommand("insertText", false, textToInsert);
  }
}

function getPasteTarget() {
  const active = document.activeElement;
  if (active && isEditable(active)) return active;
  if (lastFocusedEditable?.isConnected && isEditable(lastFocusedEditable))
    return lastFocusedEditable;
  return null;
}

function getExplicitTarget(target) {
  if (!target?.isConnected) return null;
  if (!isEditable(target)) return null;
  return target;
}

document.addEventListener(
  "focusin",
  (e) => {
    if (isEditable(e.target) && !isInsidePenrosePopup(e.target)) {
      lastFocusedEditable = e.target;
    }
  },
  true,
);

document.addEventListener("clipboard-paste-to-focused", (e) => {
  const text = e.detail?.text;
  if (typeof text !== "string") return;
  const explicitTarget = getExplicitTarget(e.detail?.target);
  const el = explicitTarget || getPasteTarget();
  if (el) insertTextAtCursor(el, text);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showFavoritesPopup") {
    showFavoritesPopup();
    sendResponse({ ok: true });
    return true;
  }
  if (
    request.action === "pasteToLastFocused" &&
    typeof request.text === "string"
  ) {
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
