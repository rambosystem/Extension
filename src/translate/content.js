import { showTranslatePopup } from "./popup.js";

// 划词时打印选中文本（选词结束即 mouseup 时）
document.addEventListener("mouseup", () => {
  const text = window.getSelection().toString().trim();
  if (text) console.log("[Penrose] selection:", text);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showTranslatePopup" && request.selectionText) {
    showTranslatePopup(request.selectionText);
    sendResponse({ ok: true });
  }
  if (request.action === "lokalise") {
    // reserved for Lokalise
  }
  return true;
});
