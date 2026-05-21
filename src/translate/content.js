import { showTranslatePopup } from "./popup.js";
import { STORAGE_KEYS } from "@/lokalise/config/storageKeys.js";
import { debugLog } from "@/utils/debug.js";

/** 最近一次划词对应的选区（用于“替换”时修改页面） */
let lastSelectionRange = null;
let lastFocusedEditable = null;
/** 失焦前保存的光标/选区，避免弹窗抢焦点后插入到开头 */
let lastEditableCaret = null;
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

function captureEditableCaret(el) {
  if (!el?.isConnected || !isEditable(el) || isInsidePenrosePopup(el)) return;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const len = el.value?.length ?? 0;
    const start =
      typeof el.selectionStart === "number" ? el.selectionStart : len;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : len;
    lastEditableCaret = {
      el,
      start: Math.max(0, Math.min(start, len)),
      end: Math.max(0, Math.min(end, len)),
    };
    return;
  }
  if (el.isContentEditable) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer)) return;
    try {
      lastEditableCaret = { el, range: range.cloneRange() };
    } catch (_) {}
  }
}

function getSavedInputCaret(el) {
  const len = el.value?.length ?? 0;
  if (
    lastEditableCaret?.el === el &&
    typeof lastEditableCaret.start === "number" &&
    typeof lastEditableCaret.end === "number"
  ) {
    return {
      start: Math.min(lastEditableCaret.start, len),
      end: Math.min(lastEditableCaret.end, len),
    };
  }
  if (document.activeElement === el) {
    const start =
      typeof el.selectionStart === "number" ? el.selectionStart : len;
    const end = typeof el.selectionEnd === "number" ? el.selectionEnd : len;
    return { start, end };
  }
  return { start: len, end: len };
}

function restoreContentEditableRange(el) {
  if (lastEditableCaret?.el !== el || !lastEditableCaret.range) return false;
  const sel = window.getSelection();
  if (!sel) return false;
  try {
    sel.removeAllRanges();
    sel.addRange(lastEditableCaret.range);
    return true;
  } catch (_) {
    return false;
  }
}

function insertTextAtCursor(el, text) {
  if (!el || !text) return;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const { start, end } = getSavedInputCaret(el);
    focusEditable(el);
    el.setSelectionRange(start, end);
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const textToInsert = addLeadingSpaceIfNeeded(
      text,
      before.trim().length > 0,
      before.slice(-1),
    );
    const nextPos = start + textToInsert.length;
    el.value = before + textToInsert + after;
    el.setSelectionRange(nextPos, nextPos);
    lastEditableCaret = { el, start: nextPos, end: nextPos };
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  if (el.isContentEditable) {
    focusEditable(el);
    restoreContentEditableRange(el);
    const prevChar = getPreviousCharInContentEditable(el);
    const textToInsert = addLeadingSpaceIfNeeded(text, !!prevChar, prevChar);
    document.execCommand("insertText", false, textToInsert);
    captureEditableCaret(el);
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
  const active = document.activeElement;
  if (isEditable(active) && !isInsidePenrosePopup(active)) {
    captureEditableCaret(active);
  }

  const sel = window.getSelection();
  const text = sel.toString().trim();
  if (text) {
    debugLog("[Penrose] selection:", text);
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
      captureEditableCaret(e.target);
    }
  },
  true,
);

document.addEventListener(
  "focusout",
  (e) => {
    if (isEditable(e.target) && !isInsidePenrosePopup(e.target)) {
      captureEditableCaret(e.target);
    }
  },
  true,
);

document.addEventListener(
  "keyup",
  (e) => {
    if (isEditable(e.target) && !isInsidePenrosePopup(e.target)) {
      captureEditableCaret(e.target);
    }
  },
  true,
);

function snapshotCaretBeforeTranslatePopup() {
  const active = document.activeElement;
  if (isEditable(active) && !isInsidePenrosePopup(active)) {
    lastFocusedEditable = active;
    captureEditableCaret(active);
    return;
  }
  if (lastFocusedEditable?.isConnected) {
    captureEditableCaret(lastFocusedEditable);
  }
}

document.addEventListener("clipboard-paste-to-focused", (e) => {
  const text = e.detail?.text;
  if (typeof text !== "string") return;
  const currentTarget = getPasteTarget();
  const explicitTarget = getExplicitTarget(e.detail?.target);
  const el = explicitTarget || currentTarget;
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
          snapshotCaretBeforeTranslatePopup();
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
    snapshotCaretBeforeTranslatePopup();
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
