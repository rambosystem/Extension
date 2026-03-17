import { createApp, ref } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import { POPUP_ID } from "./constants.js";
import { usePopupPosition } from "@/lokalise/composables/translate/usePopupPosition.js";
import TranslatePopup from "./TranslatePopup.vue";

let mountedApp = null;
let popupRoot = null;
let outsideClickHandler = null;

export function closeExistingPopup() {
  if (outsideClickHandler) {
    document.removeEventListener("click", outsideClickHandler, true);
    outsideClickHandler = null;
  }
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
 * @param {Range|null} [savedRange] 划词时保存的选区，用于“替换”；不传则尝试用当前选区
 */
export function showTranslatePopup(
  selectionText = "",
  savedRange = null,
  lastFocusedEditable = null,
) {
  console.log("[Penrose translate] selection:", selectionText);
  closeExistingPopup();

  let rangeToReplace = savedRange;
  if (!rangeToReplace) {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        rangeToReplace = sel.getRangeAt(0).cloneRange();
      }
    } catch (_) {}
  }

  function onReplace(translation) {
    if (!rangeToReplace || !translation) return;
    try {
      rangeToReplace.deleteContents();
      const textNode = document.createTextNode(translation);
      rangeToReplace.insertNode(textNode);
      rangeToReplace.setStartAfter(textNode);
      rangeToReplace.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(rangeToReplace);
    } catch (_) {}
    onClose();
  }

  injectPopupContainerStyles();

  const position = usePopupPosition();
  popupRoot = document.createElement("div");
  popupRoot.id = POPUP_ID;
  popupRoot.style.top = position.top;
  popupRoot.style.left = position.left;

  document.body.appendChild(popupRoot);

  const isPinnedRef = ref(false);
  function setPinned(pinned) {
    isPinnedRef.value = !!pinned;
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
  }

  mountedApp = createApp(TranslatePopup, {
    selectionText,
    onClose,
    onReplace,
    lastFocusedEditable,
    pinned: isPinnedRef,
    setPinned,
    onMoveBy,
  });
  mountedApp.use(ElementPlus);
  mountedApp.mount(popupRoot);

  outsideClickHandler = (e) => {
    if (isPinnedRef.value) return;
    if (e.target.closest?.(".pin_btn")) return;
    if (popupRoot && popupRoot.contains(e.target)) return;
    closeExistingPopup();
  };
  document.addEventListener("click", outsideClickHandler, true);
}
