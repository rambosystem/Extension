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

  let isPinned = false;
  function setPinned(pinned) {
    isPinned = !!pinned;
  }

  function parsePx(value) {
    if (value == null || value === "") return 0;
    const n = parseInt(String(value), 10);
    return Number.isNaN(n) ? 0 : n;
  }

  function onMoveBy(dx, dy) {
    if (!popupRoot) return;
    const left = parsePx(popupRoot.style.left) || 0;
    const top = parsePx(popupRoot.style.top) || 0;
    const vw = document.documentElement.clientWidth || window.innerWidth || 0;
    const vh = document.documentElement.clientHeight || window.innerHeight || 0;
    const w = 320;
    const h = Math.min(popupRoot.offsetHeight || 400, vh * 0.9);
    const x = Math.max(0, Math.min(left + dx, vw - w));
    const y = Math.max(0, Math.min(top + dy, vh - h));
    popupRoot.style.left = `${x}px`;
    popupRoot.style.top = `${y}px`;
  }

  function onClose() {
    closeExistingPopup();
    document.removeEventListener("click", onOutsideClick);
  }

  mountedApp = createApp(TranslatePopup, {
    selectionText,
    onClose,
    setPinned,
    onMoveBy,
  });
  mountedApp.use(ElementPlus);
  mountedApp.mount(popupRoot);

  function onOutsideClick(e) {
    if (isPinned) return;
    if (popupRoot && popupRoot.contains(e.target)) return;
    document.removeEventListener("click", onOutsideClick);
    closeExistingPopup();
  }
  document.addEventListener("click", onOutsideClick, true);
}
