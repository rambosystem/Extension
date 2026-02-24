import { showTranslatePopup } from "./popup.js";

/** 最近一次划词对应的选区（用于“替换”时修改页面） */
let lastSelectionRange = null;

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showTranslatePopup" && request.selectionText) {
    showTranslatePopup(request.selectionText, lastSelectionRange);
    sendResponse({ ok: true });
  }
  if (request.action === "lokalise") {
    // reserved for Lokalise
  }
  return true;
});
