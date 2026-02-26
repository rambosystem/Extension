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
        <div class="clipboard_title">
          {{
            showFavorites
              ? t("clipboard.favoriteTitle")
              : t("clipboard.historyTitle")
          }}
        </div>
        <div class="header_button_group">
          <button
            type="button"
            class="header_action_btn"
            :class="{ is_pinned: showFavorites }"
            @click="toggleFavoritesView"
          >
            <el-icon><StarFilled v-if="showFavorites" /><Star v-else /></el-icon>
          </button>
          <button
            v-if="!isClearConfirming"
            type="button"
            class="header_action_btn"
            :disabled="!currentItems.length"
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
      <HistoryPanel
        :items="currentItems"
        :empty-text="currentEmptyText"
        @copy="copyHistoryItem"
        @copy-and-paste="copyHistoryItemAndPaste"
        @pin="handlePin"
        @unpin="unpinHistoryItem"
        @favorite="favoriteHistoryItem"
        @delete="deleteHistoryItem"
      />
    </div>
  </PopupFrame>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { Check, Close, Star, StarFilled } from "@element-plus/icons-vue";
import PopupFrame from "@/components/PopupFrame.vue";
import HistoryPanel from "./Components/HistoryPanel.vue";
import { ROUTE_INDEX } from "@/routes/constants.js";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import cleanIcon from "@/assets/clean.svg";
import { useClipboardStore } from "./stores/clipboard.js";

const { onClose, pinned } = defineProps({
  onClose: { type: Function, required: true },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
});

const { t } = useI18n();
const clipboardStore = useClipboardStore();
const {
  history,
  lastSeenClipboard,
  isClearConfirming,
  showFavorites,
  currentItems,
} = storeToRefs(clipboardStore);
const {
  normalizeText,
  loadHistoryLimit,
  loadHistory,
  appendHistory,
  deleteHistoryItem,
  pinHistoryItem,
  unpinHistoryItem,
  favoriteHistoryItem,
  clearCurrentView,
  toggleFavoritesView,
} = clipboardStore;

const AUTO_REFRESH_INTERVAL_MS = 500;
let autoRefreshTimer = null;

const currentEmptyText = computed(() =>
  showFavorites.value ? t("clipboard.noFavorites") : t("clipboard.noHistory"),
);

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

async function confirmClearHistory() {
  const cleared = await clearCurrentView();
  if (cleared === "favorites") {
    ElMessage.success(t("clipboard.statusFavoritesCleared"));
  } else {
    ElMessage.success(t("clipboard.statusHistoryCleared"));
  }
}

async function handlePin(id) {
  const pinnedOk = await pinHistoryItem(id);
  if (pinnedOk) ElMessage.success(t("clipboard.statusPinned"));
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

.header_action_btn.is_pinned {
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

.header_action_btn :deep(.el-icon) {
  font-size: 16px;
  width: 16px;
  height: 16px;
}

.clipboard_title {
  font-size: 15px;
  line-height: 1;
  font-weight: 600;
  color: #1d1d1f;
  margin-left: 10px;
}
</style>
