// AI Generated - translate popup DOM and behavior (content script)
import { POPUP_ID } from "./constants.js";
import { getSelectionRect, escapeHtml } from "./domUtils.js";

export function closeExistingPopup() {
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();
}

/**
 * @param {string} selectionText
 */
export function showTranslatePopup(selectionText) {
  closeExistingPopup();

  const rect = getSelectionRect();
  const style = document.createElement("style");
  style.textContent = `
    #${POPUP_ID} {
      position: fixed;
      z-index: 2147483647;
      min-width: 200px;
      max-width: 360px;
      padding: 12px 14px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    #${POPUP_ID} .penrose-popup-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 22px;
      height: 22px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: #888;
      font-size: 18px;
      line-height: 1;
      padding: 0;
    }
    #${POPUP_ID} .penrose-popup-close:hover { color: #333; }
    #${POPUP_ID} .penrose-popup-title {
      font-weight: 600;
      margin-bottom: 6px;
      padding-right: 24px;
      color: #666;
    }
    #${POPUP_ID} .penrose-popup-text {
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);

  const popup = document.createElement("div");
  popup.id = POPUP_ID;

  if (rect && rect.width > 0 && rect.height > 0) {
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.left = `${rect.left}px`;
  } else {
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );
    popup.style.top = `${vh / 2 - 60}px`;
    popup.style.left = `${vw / 2 - 180}px`;
  }

  popup.innerHTML = `
    <button type="button" class="penrose-popup-close" aria-label="Close">&times;</button>
    <div class="penrose-popup-title">Translate</div>
    <div class="penrose-popup-text">${escapeHtml(selectionText)}</div>
  `;

  const closeBtn = popup.querySelector(".penrose-popup-close");
  closeBtn.addEventListener("click", () => closeExistingPopup());

  document.body.appendChild(popup);

  document.addEventListener(
    "click",
    function onOutsideClick(e) {
      if (popup.contains(e.target)) return;
      document.removeEventListener("click", onOutsideClick);
      closeExistingPopup();
    },
    true,
  );
}
