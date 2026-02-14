import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { POPUP_ID } from "./constants.js";
import { usePopupPosition } from "./composables/usePopupPosition.js";
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
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0);
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

  const position = usePopupPosition();
  popupRoot = document.createElement("div");
  popupRoot.id = POPUP_ID;
  popupRoot.style.top = position.top;
  popupRoot.style.left = position.left;

  document.body.appendChild(popupRoot);

  function onClose() {
    closeExistingPopup();
    document.removeEventListener("click", onOutsideClick);
  }

  mountedApp = createApp(TranslatePopup, {
    selectionText,
    onClose,
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
