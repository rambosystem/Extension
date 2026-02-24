import { createApp, ref } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { POPUP_ID } from "./constants.js";
import ClipboardPopup from "./ClipboardPopup.vue";

let mountedApp = null;
let popupRoot = null;

function parsePx(value) {
  if (value == null || value === "") return 0;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function closeExistingClipboardPopup() {
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
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      font-family: system-ui, -apple-system, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

/** 弹窗居中位置 */
function getCenterPosition() {
  const vw = document.documentElement.clientWidth || window.innerWidth || 0;
  const vh = document.documentElement.clientHeight || window.innerHeight || 0;
  const w = 320;
  const h = 200;
  return {
    top: `${Math.max(0, (vh - h) / 2)}px`,
    left: `${Math.max(0, (vw - w) / 2)}px`,
  };
}

export function showClipboardPopup() {
  closeExistingClipboardPopup();
  injectPopupContainerStyles();

  const position = getCenterPosition();
  popupRoot = document.createElement("div");
  popupRoot.id = POPUP_ID;
  popupRoot.style.top = position.top;
  popupRoot.style.left = position.left;

  document.body.appendChild(popupRoot);

  const isPinnedRef = ref(false);
  function setPinned(pinned) {
    isPinnedRef.value = !!pinned;
  }
  function onMoveBy(dx, dy) {
    if (!popupRoot) return;
    const left = parsePx(popupRoot.style.left) || 0;
    const top = parsePx(popupRoot.style.top) || 0;
    const vw = document.documentElement.clientWidth || window.innerWidth || 0;
    const vh = document.documentElement.clientHeight || window.innerHeight || 0;
    const w = 320;
    const h = Math.min(popupRoot.offsetHeight || 200, vh * 0.9);
    const x = Math.max(0, Math.min(left + dx, vw - w));
    const y = Math.max(0, Math.min(top + dy, vh - h));
    popupRoot.style.left = `${x}px`;
    popupRoot.style.top = `${y}px`;
  }

  function onClose() {
    closeExistingClipboardPopup();
    document.removeEventListener("click", onOutsideClick);
  }

  mountedApp = createApp(ClipboardPopup, {
    onClose,
    pinned: isPinnedRef,
    setPinned,
    onMoveBy,
  });
  mountedApp.use(ElementPlus);
  mountedApp.mount(popupRoot);

  function onOutsideClick(e) {
    if (isPinnedRef.value) return;
    if (e.target.closest?.(".pin_btn")) return;
    if (popupRoot && popupRoot.contains(e.target)) return;
    document.removeEventListener("click", onOutsideClick);
    closeExistingClipboardPopup();
  }
  document.addEventListener("click", onOutsideClick, true);
}
