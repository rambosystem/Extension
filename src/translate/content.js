import { showTranslatePopup } from "./popup.js";
import { STORAGE_KEYS } from "@/lokalise/config/storageKeys.js";

/** 最近一次划词对应的选区（用于“替换”时修改页面） */
let lastSelectionRange = null;
let lastFocusedEditable = null;
let lastPointer = null;
let lastPointerAt = 0;

function isInsidePenrosePopup(el) {
  if (!el?.closest) return false;
  return !!el.closest("#penrose-translate-popup");
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
  if (active && isEditable(active) && !isInsidePenrosePopup(active))
    return active;
  if (lastFocusedEditable?.isConnected && isEditable(lastFocusedEditable))
    return lastFocusedEditable;
  return null;
}

function getExplicitTarget(target) {
  if (!target?.isConnected) return null;
  if (!isEditable(target)) return null;
  return target;
}

function rememberPointerFromEvent(event) {
  if (!event) return;
  const x = Number(event.clientX);
  const y = Number(event.clientY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  lastPointer = { x, y };
  lastPointerAt = Date.now();
}

function getRecentPointer() {
  if (!lastPointer) return null;
  if (Date.now() - lastPointerAt > 5000) return null;
  return { ...lastPointer };
}

function isEditable(el) {
  if (!el || !el.tagName) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  return el.isContentEditable === true;
}

document.addEventListener("mouseup", () => {
  const sel = window.getSelection();
  const text = sel.toString().trim();
  if (text) {
    console.log("[Penrose] selection:", text);
    try {
      lastSelectionRange = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    } catch (_) {
      lastSelectionRange = null;
    }
  } else {
    lastSelectionRange = null;
  }
});

document.addEventListener("mousemove", rememberPointerFromEvent, {
  passive: true,
});
document.addEventListener("mousedown", rememberPointerFromEvent, {
  passive: true,
});
document.addEventListener("mouseup", rememberPointerFromEvent, {
  passive: true,
});

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
  const currentTarget = getPasteTarget();
  const explicitTarget = getExplicitTarget(e.detail?.target);
  const el = currentTarget || explicitTarget;
  if (el) insertTextAtCursor(el, text);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showTranslatePopup" && request.selectionText) {
    chrome.storage.local.get(
      [STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED],
      (result) => {
        const enabled =
          result[STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED] === "true";
        if (enabled) {
          showTranslatePopup(
            request.selectionText,
            lastSelectionRange,
            lastFocusedEditable,
            getRecentPointer(),
          );
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, reason: "word_selection_translate_disabled" });
        }
      },
    );
    return true;
  }
  if (request.action === "showTranslatePopup") {
    showTranslatePopup("", null, lastFocusedEditable, getRecentPointer());
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === "lokalise") {
    // reserved for Lokalise
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
