<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form label-position="top" class="settings-form">
      <el-form-item :label="t('clipboard.historyLimitLabel')" label-position="left">
        <div class="history-limit-setting">
          <el-input-number v-model="historyLimit" :min="CLIPBOARD_HISTORY_MIN_LIMIT" :max="CLIPBOARD_HISTORY_MAX_LIMIT"
            :step="1" :step-strictly="true" controls-position="right" />
        </div>
      </el-form-item>

      <el-form-item :label="t('clipboard.openClipboardPopup')" label-position="left">
        <div class="shortcut-setting-row" role="button" tabindex="0" @click="openShortcutSettings"
          @keydown.enter.prevent="openShortcutSettings" @keydown.space.prevent="openShortcutSettings">
          <div class="shortcut-action-group">
            <el-button
              text
              circle
              class="shortcut-setting-btn"
              :title="t('clipboard.clearShortcutButton')"
              @click.stop="clearShortcut"
            >
              <img :src="shortcutActionIcon" class="shortcut-action-icon" alt="" draggable="false" />
            </el-button>
            <span class="shortcut-key-chip">{{ shortcutDisplay }}</span>
          </div>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import shortcutActionIcon from "@/assets/delete.svg";
import {
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
  CLIPBOARD_SHORTCUT_DISABLED_STORAGE_KEY,
  CLIPBOARD_HISTORY_DEFAULT_LIMIT,
  CLIPBOARD_HISTORY_MIN_LIMIT,
  CLIPBOARD_HISTORY_MAX_LIMIT,
  normalizeHistoryLimit,
} from "@/clipboard/storage.js";

const { t } = useI18n();
defineProps({
  title: {
    type: String,
    required: true,
  },
});
const historyLimit = ref(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
const loaded = ref(false);
const shortcutDisabled = ref(false);
const shortcutDisplay = computed(() => {
  if (shortcutDisabled.value) return t("clipboard.shortcutEmpty");
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  return isMac ? "⇧⌘V" : "Ctrl+Shift+V";
});

function loadHistoryLimit() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.get([CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY], (result) => {
      historyLimit.value = normalizeHistoryLimit(
        result?.[CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY],
      );
      resolve();
    });
  });
}

function saveHistoryLimitToStorage(value) {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(
      { [CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY]: value },
      () => resolve(),
    );
  });
}

function loadShortcutState() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.get([CLIPBOARD_SHORTCUT_DISABLED_STORAGE_KEY], (result) => {
      shortcutDisabled.value = !!result?.[CLIPBOARD_SHORTCUT_DISABLED_STORAGE_KEY];
      resolve();
    });
  });
}

async function saveHistoryLimit() {
  historyLimit.value = normalizeHistoryLimit(historyLimit.value);
  await saveHistoryLimitToStorage(historyLimit.value);
}

onMounted(async () => {
  await loadHistoryLimit();
  await loadShortcutState();
  loaded.value = true;
});

watch(historyLimit, async () => {
  if (!loaded.value) return;
  await saveHistoryLimit();
});

function openShortcutSettings() {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) return;
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

function clearShortcut() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  shortcutDisabled.value = true;
  chrome.storage.local.set({ [CLIPBOARD_SHORTCUT_DISABLED_STORAGE_KEY]: true });
}
</script>

<style lang="scss" scoped>
.setting_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.settings-form {
  width: 100%;
}

.clipboard-description {
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.history-limit-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;

  .el-input-number {
    width: 200px;
    color: #606266;
  }
}

.shortcut-setting-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0;
  cursor: pointer;
  user-select: none;
}

.shortcut-setting-row:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.shortcut-action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-key-chip {
  min-width: 200px;
  height: 32px;
  padding: 0 14px;
  display: inline-flex;
  justify-content: flex-start;
  align-items: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  color: #1f2937;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.shortcut-key-chip:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
}

.shortcut-setting-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  color: #374151;
}

.shortcut-action-icon {
  width: 16px;
  height: 16px;
  display: block;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
