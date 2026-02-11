export function useClipboard() {
  function copy(text) {
    if (typeof text !== "string") return;
    return navigator.clipboard.writeText(text).catch(() => {});
  }
  return { copy };
}
