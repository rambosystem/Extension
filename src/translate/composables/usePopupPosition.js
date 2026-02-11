import { getSelectionRect } from "../domUtils.js";

const FALLBACK_OFFSET_Y = 60;
const FALLBACK_OFFSET_X = 180;

/**
 * @returns {{ top: string, left: string }}
 */
export function usePopupPosition() {
  const rect = getSelectionRect();
  if (rect && rect.width > 0 && rect.height > 0) {
    return {
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
    };
  }
  const vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0,
  );
  const vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0,
  );
  return {
    top: `${vh / 2 - FALLBACK_OFFSET_Y}px`,
    left: `${vw / 2 - FALLBACK_OFFSET_X}px`,
  };
}
