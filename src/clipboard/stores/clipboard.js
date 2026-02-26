import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  CLIPBOARD_HISTORY_STORAGE_KEY,
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
  CLIPBOARD_HISTORY_DEFAULT_LIMIT,
  normalizeHistoryLimit,
} from "../storage.js";

export const useClipboardStore = defineStore("clipboard", () => {
  const history = ref([]);
  const historyLimit = ref(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
  const lastSeenClipboard = ref("");
  const isClearConfirming = ref(false);
  const showFavorites = ref(false);

  const favoriteItems = computed(() =>
    history.value.filter((item) => item?.favorite === true),
  );
  const currentItems = computed(() =>
    showFavorites.value ? favoriteItems.value : history.value,
  );

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
      pinned: item?.pinned === true,
      favorite: item?.favorite === true,
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

  function applyHistoryRules(list, limit) {
    const normalized = list
      .map((item) => normalizeHistoryItem(item))
      .filter(Boolean);
    const deduped = dedupeByTextKeepOrder(normalized);
    const pinned = deduped
      .filter((item) => item.pinned)
      .map((item) => ({ ...item, pinned: true }));
    const unpinned = deduped
      .filter((item) => !item.pinned)
      .map((item) => ({ ...item, pinned: false }));
    const ordered = [...pinned, ...unpinned];

    // Favorites are never capped by history limit.
    const next = [];
    let nonFavoriteCount = 0;
    for (const item of ordered) {
      if (item.favorite) {
        next.push(item);
        continue;
      }
      if (nonFavoriteCount < limit) {
        next.push(item);
        nonFavoriteCount += 1;
      }
    }
    return next;
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

  function readHistoryLimitFromStorage() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        resolve(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
        return;
      }
      chrome.storage.local.get(
        [CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY],
        (result) => {
          resolve(
            normalizeHistoryLimit(result?.[CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY]),
          );
        },
      );
    });
  }

  async function loadHistoryLimit() {
    historyLimit.value = await readHistoryLimitFromStorage();
  }

  async function loadHistory() {
    const list = await readHistoryFromStorage();
    history.value = applyHistoryRules(list, historyLimit.value);
  }

  async function appendHistory(text) {
    const value = normalizeText(text);
    if (!value) return;
    const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
    const sameItem = list.find((item) => normalizeText(item?.text) === value);
    const samePinned = list.find(
      (item) => item.pinned && normalizeText(item?.text) === value,
    );
    const now = Date.now();

    let next = [];
    if (samePinned) {
      next = list.map((item) =>
        item.id === samePinned.id
          ? { ...item, text: value, createdAt: now, pinned: true }
          : item,
      );
    } else if (sameItem) {
      const withoutSameText = list.filter(
        (item) => normalizeText(item?.text) !== value,
      );
      const pinnedItems = withoutSameText.filter((item) => item.pinned);
      const unpinnedItems = withoutSameText.filter((item) => !item.pinned);
      const refreshedItem = {
        ...sameItem,
        text: value,
        createdAt: now,
        pinned: false,
        favorite: sameItem.favorite === true,
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
        favorite: false,
      };
      next = [...pinnedItems, newItem, ...unpinnedItems];
    }
    next = applyHistoryRules(next, historyLimit.value);
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function deleteHistoryItem(id) {
    const list = await readHistoryFromStorage();
    const next = applyHistoryRules(
      list.filter((item) => item?.id !== id),
      historyLimit.value,
    );
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function pinHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
    const target = list.find((item) => item.id === id);
    if (!target) return false;
    const rest = list.filter((item) => item.id !== id);
    const next = applyHistoryRules(
      [{ ...target, pinned: true }, ...rest],
      historyLimit.value,
    );
    await saveHistoryToStorage(next);
    history.value = next;
    return true;
  }

  async function unpinHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
    const target = list.find((item) => item.id === id);
    if (!target) return;
    const pinnedItems = list.filter((item) => item.pinned && item.id !== id);
    const unpinnedItems = [
      { ...target, pinned: false },
      ...list.filter((item) => !item.pinned && item.id !== id),
    ];
    const next = applyHistoryRules(
      [...pinnedItems, ...unpinnedItems],
      historyLimit.value,
    );
    await saveHistoryToStorage(next);
    history.value = next;
  }

  async function favoriteHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
    const next = applyHistoryRules(
      list.map((item) => (item.id === id ? { ...item, favorite: true } : item)),
      historyLimit.value,
    );
    await saveHistoryToStorage(next);
    history.value = next;
    isClearConfirming.value = false;
    showFavorites.value = true;
  }

  async function unfavoriteHistoryItem(id) {
    const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
    const next = applyHistoryRules(
      list.map((item) => (item.id === id ? { ...item, favorite: false } : item)),
      historyLimit.value,
    );
    await saveHistoryToStorage(next);
    history.value = next;
    isClearConfirming.value = false;
  }

  async function clearCurrentView() {
    if (showFavorites.value) {
      const list = applyHistoryRules(await readHistoryFromStorage(), historyLimit.value);
      const next = applyHistoryRules(
        list.map((item) => ({ ...item, favorite: false })),
        historyLimit.value,
      );
      await saveHistoryToStorage(next);
      history.value = next;
      isClearConfirming.value = false;
      return "favorites";
    }
    await saveHistoryToStorage([]);
    history.value = [];
    lastSeenClipboard.value = "";
    isClearConfirming.value = false;
    return "history";
  }

  function toggleFavoritesView() {
    isClearConfirming.value = false;
    showFavorites.value = !showFavorites.value;
  }

  return {
    history,
    historyLimit,
    lastSeenClipboard,
    isClearConfirming,
    showFavorites,
    favoriteItems,
    currentItems,
    normalizeText,
    loadHistoryLimit,
    loadHistory,
    appendHistory,
    deleteHistoryItem,
    pinHistoryItem,
    unpinHistoryItem,
    favoriteHistoryItem,
    unfavoriteHistoryItem,
    clearCurrentView,
    toggleFavoritesView,
  };
});
