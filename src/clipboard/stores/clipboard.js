import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { CLIPBOARD_HISTORY_STORAGE_KEY } from "../storage.js";

export const useClipboardStore = defineStore("clipboard", () => {
  const history = ref([]);
  const isClearConfirming = ref(false);
  const currentItems = computed(() => history.value);

  function normalizeText(text) {
    if (typeof text !== "string") return "";
    return text.trim();
  }

  function normalizeHistoryItem(item) {
    const text = normalizeText(item?.text);
    if (!text) return null;
    const id = typeof item?.id === "string" ? item.id : "";
    if (!id) return null;
    const createdAt =
      typeof item?.createdAt === "number" && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now();
    return {
      id,
      text,
      createdAt,
      pinned: item?.pinned === true || item?.favoritePinned === true,
      favorite: item?.favorite === true,
      favoritePinned: false,
    };
  }

  function dedupeByTextKeepOrder(list) {
    const seen = new Set();
    const next = [];
    for (const item of list) {
      const key = normalizeText(item?.text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      next.push(item);
    }
    return next;
  }

  function applyHistoryRules(list) {
    const normalized = list
      .map((item) => normalizeHistoryItem(item))
      .filter(Boolean);
    const favoritesOnly = normalized.filter((item) => item.favorite === true);
    const deduped = dedupeByTextKeepOrder(favoritesOnly);
    const pinned = deduped
      .filter((item) => item.pinned)
      .map((item) => ({ ...item, pinned: true }));
    const unpinned = deduped
      .filter((item) => !item.pinned)
      .map((item) => ({ ...item, pinned: false }));
    return [...pinned, ...unpinned];
  }

  function readHistoryFromStorage() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        resolve([]);
        return;
      }
      chrome.storage.local.get([CLIPBOARD_HISTORY_STORAGE_KEY], (result) => {
        const list = Array.isArray(result?.[CLIPBOARD_HISTORY_STORAGE_KEY])
          ? result[CLIPBOARD_HISTORY_STORAGE_KEY]
          : [];
        resolve(list);
      });
    });
  }

  function saveHistoryToStorage(list) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ [CLIPBOARD_HISTORY_STORAGE_KEY]: list }, () =>
        resolve(),
      );
    });
  }

  async function loadHistory() {
    const list = await readHistoryFromStorage();
    history.value = applyHistoryRules(list);
  }

  async function appendHistory(text) {
    const value = normalizeText(text);
    if (!value) return;
    const list = applyHistoryRules(await readHistoryFromStorage());
    const sameItem = list.find((item) => normalizeText(item?.text) === value);
    const now = Date.now();

    let next = [];
    if (sameItem) {
      const withoutSameText = list.filter(
        (item) => normalizeText(item?.text) !== value,
      );
      const pinnedItems = withoutSameText.filter((item) => item.pinned);
      const unpinnedItems = withoutSameText.filter((item) => !item.pinned);
      const refreshedItem = {
        ...sameItem,
        text: value,
        createdAt: now,
        pinned: sameItem.pinned === true,
        favorite: true,
        favoritePinned: false,
      };
      next = [...pinnedItems, refreshedItem, ...unpinnedItems];
    } else {
      const withoutSameText = list.filter(
        (item) => normalizeText(item?.text) !== value,
      );
      const pinnedItems = withoutSameText.filter((item) => item.pinned);
      const unpinnedItems = withoutSameText.filter((item) => !item.pinned);
      const newItem = {
        id: `${now}-${Math.random().toString(16).slice(2)}`,
        text: value,
        createdAt: now,
        pinned: false,
        favorite: true,
        favoritePinned: false,
      };
      next = [...pinnedItems, newItem, ...unpinnedItems];
    }
    next = applyHistoryRules(next);
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function deleteHistoryItem(id) {
    const list = await readHistoryFromStorage();
    const next = applyHistoryRules(list.filter((item) => item?.id !== id));
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function pinHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage());
    const target = list.find((item) => item.id === id);
    if (!target) return false;
    const rest = list.filter((item) => item.id !== id);
    const next = applyHistoryRules([{ ...target, pinned: true }, ...rest]);
    await saveHistoryToStorage(next);
    history.value = next;
    return true;
  }

  async function unpinHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage());
    const target = list.find((item) => item.id === id);
    if (!target) return;
    const pinnedItems = list.filter((item) => item.pinned && item.id !== id);
    const unpinnedItems = [
      { ...target, pinned: false },
      ...list.filter((item) => !item.pinned && item.id !== id),
    ];
    const next = applyHistoryRules([...pinnedItems, ...unpinnedItems]);
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function clearCurrentView() {
    await saveHistoryToStorage([]);
    history.value = [];
    isClearConfirming.value = false;
    return "favorites";
  }

  return {
    history,
    isClearConfirming,
    currentItems,
    normalizeText,
    loadHistory,
    appendHistory,
    deleteHistoryItem,
    pinHistoryItem,
    unpinHistoryItem,
    clearCurrentView,
  };
});
