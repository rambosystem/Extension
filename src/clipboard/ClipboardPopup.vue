<template>
  <PopupFrame :on-close="onClose" show-pin show-settings :setting-title="t('settings.title')"
    :setting-route="ROUTE_INDEX.CLIPBOARD" :pinned="pinned" :set-pinned="setPinned" :on-move-by="onMoveBy">
    <div class="clipboard_view">
      <div class="clipboard_header">
        <div class="clipboard_title">{{ t("clipboard.historyTitle") }}</div>
      </div>

      <el-scrollbar v-if="history.length" height="320px" class="history_scrollbar">
        <div class="history_list">
          <div v-for="item in history" :key="item.id" class="history_item_row">
            <HistoryCard
              :item="item"
              @copy="copyHistoryItem"
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
import PopupFrame from "@/Components/PopupFrame.vue";
import HistoryCard from "./Components/HistoryCard.vue";
import { ROUTE_INDEX } from "@/routes/constants.js";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import {
  CLIPBOARD_HISTORY_STORAGE_KEY,
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
  CLIPBOARD_HISTORY_DEFAULT_LIMIT,
  normalizeHistoryLimit,
} from "./storage.js";

defineProps({
  onClose: { type: Function, required: true },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
});

const { t } = useI18n();

const history = ref([]);
const historyLimit = ref(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
const lastSeenClipboard = ref("");
const AUTO_REFRESH_INTERVAL_MS = 500;
let autoRefreshTimer = null;

function normalizeText(text) {
  if (typeof text !== "string") return "";
  return text.trim();
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
  history.value = list.slice(0, historyLimit.value);
}

function readHistoryLimitFromStorage() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
      return;
    }
    chrome.storage.local.get([CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY], (result) => {
      resolve(normalizeHistoryLimit(result?.[CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY]));
    });
  });
}

async function loadHistoryLimit() {
  historyLimit.value = await readHistoryLimitFromStorage();
}

async function appendHistory(text) {
  const value = normalizeText(text);
  if (!value) return;
  const list = await readHistoryFromStorage();
  const deduped = list.filter((item) => item?.text !== value);
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: value,
      createdAt: Date.now(),
    },
    ...deduped,
  ].slice(0, historyLimit.value);
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

async function deleteHistoryItem(id) {
  const next = history.value.filter((item) => item.id !== id);
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

.clipboard_title {
  font-size: 15px;
  line-height: 1;
  font-weight: 600;
  color: #1d1d1f;
}

.history_list {
  padding-right: 2px;
}

.history_item_row {
  margin: 10px;
}

.history_scrollbar {
  max-height: 320px;
}

.clipboard_placeholder {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}
</style>
