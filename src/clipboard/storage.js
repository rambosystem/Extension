export const CLIPBOARD_HISTORY_STORAGE_KEY = "clipboard_history";
export const CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY = "clipboard_history_limit";

export const CLIPBOARD_HISTORY_DEFAULT_LIMIT = 20;
export const CLIPBOARD_HISTORY_MIN_LIMIT = 1;
export const CLIPBOARD_HISTORY_MAX_LIMIT = 100;

export function normalizeHistoryLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return CLIPBOARD_HISTORY_DEFAULT_LIMIT;
  const integer = Math.round(n);
  return Math.max(
    CLIPBOARD_HISTORY_MIN_LIMIT,
    Math.min(CLIPBOARD_HISTORY_MAX_LIMIT, integer),
  );
}
