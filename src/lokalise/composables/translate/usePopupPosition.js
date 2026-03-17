import { getSelectionRect } from "@/translate/domUtils.js";

const FALLBACK_OFFSET_Y = 60;
const FALLBACK_OFFSET_X = 180;
const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 420;
const VIEWPORT_GAP = 8;
const CURSOR_OFFSET = 12;

function getViewportSize() {
  const vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0,
  );
  const vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0,
  );
  return { vw, vh };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function fitInViewport(left, top) {
  const { vw, vh } = getViewportSize();
  const maxLeft = Math.max(VIEWPORT_GAP, vw - POPUP_WIDTH - VIEWPORT_GAP);
  const maxTop = Math.max(VIEWPORT_GAP, vh - POPUP_HEIGHT - VIEWPORT_GAP);
  return {
    top: `${clamp(top, VIEWPORT_GAP, maxTop)}px`,
    left: `${clamp(left, VIEWPORT_GAP, maxLeft)}px`,
  };
}

function getPositionByPoint(point) {
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const { vw, vh } = getViewportSize();
  let left = x + CURSOR_OFFSET;
  let top = y + CURSOR_OFFSET;
  if (left + POPUP_WIDTH > vw - VIEWPORT_GAP) {
    left = x - POPUP_WIDTH - CURSOR_OFFSET;
  }
  if (top + POPUP_HEIGHT > vh - VIEWPORT_GAP) {
    top = y - POPUP_HEIGHT - CURSOR_OFFSET;
  }
  return fitInViewport(left, top);
}

/**
 * @param {{ x: number, y: number } | null} [anchorPoint]
 * @returns {{ top: string, left: string }}
 */
export function usePopupPosition(anchorPoint = null) {
  const anchorPosition = getPositionByPoint(anchorPoint);
  if (anchorPosition) return anchorPosition;

  const rect = getSelectionRect();
  if (rect && rect.width > 0 && rect.height > 0) {
    return fitInViewport(rect.left, rect.bottom + 8);
  }
  const { vw, vh } = getViewportSize();
  return fitInViewport(vw / 2 - FALLBACK_OFFSET_X, vh / 2 - FALLBACK_OFFSET_Y);
}
