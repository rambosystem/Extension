// AI Generated - translate popup: Vue + Element Plus (content script, built as IIFE)
import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { POPUP_ID } from "./constants.js";
import { getSelectionRect } from "./domUtils.js";
import TranslatePopup from "./TranslatePopup.vue";

let mountedApp = null;
let popupRoot = null;

export function closeExistingPopup() {
  if (mountedApp && popupRoot) {
    mountedApp.unmount();
    mountedApp = null;
    popupRoot.remove();
    popupRoot = null;
  }
  const existing = document.getElementById(POPUP_ID);
  if (existing) existing.remove();
}

function injectPopupContainerStyles() {
  if (document.getElementById(`${POPUP_ID}-styles`)) return;
  const style = document.createElement("style");
  style.id = `${POPUP_ID}-styles`;
  style.textContent = `
    #${POPUP_ID} {
      position: fixed;
      z-index: 2147483647;
      padding: 12px 14px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

/**
 * @param {string} selectionText
 */
export function showTranslatePopup(selectionText) {
  console.log("[Penrose translate] selection:", selectionText);
  closeExistingPopup();

  injectPopupContainerStyles();

  const rect = getSelectionRect();
  popupRoot = document.createElement("div");
  popupRoot.id = POPUP_ID;

  if (rect && rect.width > 0 && rect.height > 0) {
    popupRoot.style.top = `${rect.bottom + 8}px`;
    popupRoot.style.left = `${rect.left}px`;
  } else {
    const vw = Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    );
    popupRoot.style.top = `${vh / 2 - 60}px`;
    popupRoot.style.left = `${vw / 2 - 180}px`;
  }

  document.body.appendChild(popupRoot);

  mountedApp = createApp(TranslatePopup, {
    selectionText,
    onClose: () => {
      closeExistingPopup();
      document.removeEventListener("click", onOutsideClick);
    },
  });
  mountedApp.use(ElementPlus);
  mountedApp.mount(popupRoot);

  function onOutsideClick(e) {
    if (popupRoot && popupRoot.contains(e.target)) return;
    document.removeEventListener("click", onOutsideClick);
    closeExistingPopup();
  }
  document.addEventListener("click", onOutsideClick, true);
}
