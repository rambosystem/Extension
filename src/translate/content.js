import { showTranslatePopup } from "./popup.js";
import { STORAGE_KEYS } from "@/lokalise/config/storageKeys.js";

/** 最近一次划词对应的选区（用于“替换”时修改页面） */
let lastSelectionRange = null;
let lastFocusedEditable = null;

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

document.addEventListener(
  "focusin",
  (e) => {
    if (isEditable(e.target)) lastFocusedEditable = e.target;
  },
  true,
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showTranslatePopup" && request.selectionText) {
    chrome.storage.local.get(
      [STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED],
      (result) => {
        const enabled =
          result[STORAGE_KEYS.WORD_SELECTION_TRANSLATE_ENABLED] === "true";
        if (enabled) {
          showTranslatePopup(request.selectionText, lastSelectionRange);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, reason: "word_selection_translate_disabled" });
        }
      },
    );
    return true;
  }
  if (request.action === "showTranslatePopup") {
    showTranslatePopup("", null, lastFocusedEditable);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === "lokalise") {
    // reserved for Lokalise
  }
  return true;
});
