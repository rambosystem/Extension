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
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import {
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
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

async function saveHistoryLimit() {
  historyLimit.value = normalizeHistoryLimit(historyLimit.value);
  await saveHistoryLimitToStorage(historyLimit.value);
}

onMounted(async () => {
  await loadHistoryLimit();
  loaded.value = true;
});

watch(historyLimit, async () => {
  if (!loaded.value) return;
  await saveHistoryLimit();
});
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

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
