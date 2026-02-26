<template>
  <PopupFrame
    :on-close="onClose"
    show-pin
    show-settings
    :setting-title="t('settings.title')"
    :setting-route="ROUTE_INDEX.CLIPBOARD"
    :pinned="pinned"
    :set-pinned="setPinned"
    :on-move-by="onMoveBy"
  >
    <div class="clipboard_view">
      <div class="clipboard_header">
        <div class="clipboard_title">{{ t("clipboard.historyTitle") }}</div>
        <div class="header_button_group">
          <button
            v-if="!isClearConfirming"
            type="button"
            class="header_action_btn"
            :disabled="!history.length"
            @click="isClearConfirming = true"
          >
            <img
              :src="cleanIcon"
              class="header_action_img"
              alt=""
              draggable="false"
            />
          </button>
          <template v-else>
            <button
              type="button"
              class="header_action_btn"
              @click="confirmClearHistory"
            >
              <el-icon><Check /></el-icon>
            </button>
            <button
              type="button"
              class="header_action_btn"
              @click="isClearConfirming = false"
            >
              <el-icon><Close /></el-icon>
            </button>
          </template>
        </div>
      </div>

      <el-scrollbar
        v-if="history.length"
        height="320px"
        class="history_scrollbar"
      >
        <div class="history_list">
          <div
            v-for="(item, index) in history"
            :key="item.id"
            class="history_item_row"
          >
            <HistoryCard
              :item="item"
              :is-top="!!item.pinned"
              @copy="copyHistoryItem"
              @copy-and-paste="copyHistoryItemAndPaste"
              @pin="pinHistoryItem"
              @unpin="unpinHistoryItem"
              @delete="deleteHistoryItem"
            />
          </div>
        </div>
      </el-scrollbar>
      <p v-else class="clipboard_placeholder">{{ t("clipboard.noHistory") }}</p>
    </div>
  </PopupFrame>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { Check, Close } from "@element-plus/icons-vue";
import PopupFrame from "@/components/PopupFrame.vue";
import HistoryCard from "./Components/HistoryCard.vue";
import { ROUTE_INDEX } from "@/routes/constants.js";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import cleanIcon from "@/assets/clean.svg";
import {
  CLIPBOARD_HISTORY_STORAGE_KEY,
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
  CLIPBOARD_HISTORY_DEFAULT_LIMIT,
  normalizeHistoryLimit,
} from "./storage.js";

const { onClose, pinned } = defineProps({
  onClose: { type: Function, required: true },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
});

const { t } = useI18n();

const history = ref([]);
const historyLimit = ref(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
const lastSeenClipboard = ref("");
const isClearConfirming = ref(false);
const AUTO_REFRESH_INTERVAL_MS = 500;
let autoRefreshTimer = null;

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
    .map((item) => ({
      ...item,
      pinned: true,
    }));
  const unpinned = deduped
    .filter((item) => !item.pinned)
    .map((item) => ({
      ...item,
      pinned: false,
    }));
  const ordered = [...pinned, ...unpinned];
  return ordered.slice(0, limit);
}

function sortByCreatedAtDesc(list) {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
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
  const next = applyHistoryRules(list, historyLimit.value);
  history.value = next;
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

async function appendHistory(text) {
  const value = normalizeText(text);
  if (!value) return;
  const list = applyHistoryRules(
    await readHistoryFromStorage(),
    historyLimit.value,
  );
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
    };
    next = [...pinnedItems, newItem, ...unpinnedItems];
  }
  next = applyHistoryRules(next, historyLimit.value);
  await saveHistoryToStorage(next);
  history.value = next;
}

async function readClipboardAndCapture(options = {}) {
  const { force = false } = options;
  if (!force && document.hidden) return;
  try {
    const text = await navigator.clipboard.readText();
    const normalized = normalizeText(text);
    if (!normalized) return;
    if (normalized === lastSeenClipboard.value) return;
    lastSeenClipboard.value = normalized;
    await appendHistory(text);
  } catch (_) {
    // Ignore silent polling errors from browser permission/focus rules
  }
}

async function copyHistoryItem(item) {
  const value = normalizeText(item?.text);
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    await appendHistory(value);
    lastSeenClipboard.value = value;
    ElMessage.success(t("clipboard.statusCopied"));
  } catch (_) {
    ElMessage.error(t("clipboard.statusCopyFailed"));
  }
}

async function copyHistoryItemAndPaste(item) {
  const value = normalizeText(item?.text);
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    await appendHistory(value);
    lastSeenClipboard.value = value;
    const hasChromeTabs = typeof chrome !== "undefined" && chrome?.tabs;
    if (hasChromeTabs) {
      try {
        let [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
        if (!tab?.id && chrome.windows) {
          const windows = await chrome.windows.getAll({
            windowTypes: ["normal"],
          });
          for (const win of windows) {
            const [t] = await chrome.tabs.query({
              active: true,
              windowId: win.id,
            });
            if (t?.id && t.url) {
              tab = t;
              break;
            }
          }
        }
        if (
          tab?.id &&
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("edge://")
        ) {
          await chrome.tabs.sendMessage(tab.id, {
            action: "pasteToLastFocused",
            text: value,
          });
        }
      } catch (_) {
        // sendMessage failed (e.g. extension popup context)
      }
    } else {
      document.dispatchEvent(
        new CustomEvent("clipboard-paste-to-focused", {
          detail: { text: value },
        }),
      );
    }

    if (!pinned) onClose?.();
  } catch (_) {
    ElMessage.error(t("clipboard.statusCopyFailed"));
  }
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

async function confirmClearHistory() {
  await saveHistoryToStorage([]);
  history.value = [];
  lastSeenClipboard.value = "";
  isClearConfirming.value = false;
  ElMessage.success(t("clipboard.statusHistoryCleared"));
}

async function pinHistoryItem(id) {
  const list = applyHistoryRules(
    await readHistoryFromStorage(),
    historyLimit.value,
  );
  const target = list.find((item) => item.id === id);
  if (!target) return;
  const rest = list.filter((item) => item.id !== id);
  const next = applyHistoryRules(
    [{ ...target, pinned: true }, ...rest],
    historyLimit.value,
  );
  await saveHistoryToStorage(next);
  history.value = next;
  ElMessage.success(t("clipboard.statusPinned"));
}

async function unpinHistoryItem(id) {
  const list = applyHistoryRules(
    await readHistoryFromStorage(),
    historyLimit.value,
  );
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

onMounted(async () => {
  await loadHistoryLimit();
  await loadHistory();
  void readClipboardAndCapture({ force: true });
  autoRefreshTimer = window.setInterval(() => {
    void readClipboardAndCapture();
  }, AUTO_REFRESH_INTERVAL_MS);
  window.addEventListener("focus", handleWindowFocus);
});

onUnmounted(() => {
  if (autoRefreshTimer != null) {
    window.clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
  window.removeEventListener("focus", handleWindowFocus);
});

function handleWindowFocus() {
  void readClipboardAndCapture({ force: true });
}
</script>

<style scoped lang="scss">
.clipboard_view {
  display: grid;
  gap: 10px;
}

.clipboard_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header_button_group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 10px;
}

.header_action_btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.header_action_btn:hover:not(:disabled) {
  background: #e5e7eb;
  color: #111827;
}

.header_action_btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.header_action_img {
  width: 16px;
  height: 16px;
  display: block;
}

.clipboard_title {
  font-size: 15px;
  line-height: 1;
  font-weight: 600;
  color: #1d1d1f;
  margin-left: 10px;
}

.history_list {
  padding-right: 2px;
}

.history_item_row {
  margin: 10px;
}

.history_scrollbar {
  max-height: 320px;
  overscroll-behavior: contain;

  :deep(.el-scrollbar__wrap) {
    overscroll-behavior: contain;
  }
}

.clipboard_placeholder {
  margin-left: 10px;
  font-size: 13px;
  color: #6b7280;
}
</style>
