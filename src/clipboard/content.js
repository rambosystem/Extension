import { showClipboardPopup } from "./popup.js";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showClipboardPopup") {
    showClipboardPopup();
    sendResponse({ ok: true });
  }
  return true;
});
