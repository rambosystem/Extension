<template>
  <div class="setting_group">
    <h2 class="title">{{ t("clipboard.title") }}</h2>
    <p class="clipboard-description">{{ t("clipboard.description") }}</p>
    <el-form label-position="top" class="settings-form">
      <el-form-item :label="t('clipboard.historyLimitLabel')">
        <div class="limit_row">
          <el-input-number
            v-model="historyLimit"
            :min="CLIPBOARD_HISTORY_MIN_LIMIT"
            :max="CLIPBOARD_HISTORY_MAX_LIMIT"
            :step="1"
            :step-strictly="true"
            controls-position="right"
          />
          <el-button type="primary" :loading="saving" @click="saveHistoryLimit">
            {{ t("common.save") }}
          </el-button>
        </div>
        <p class="field_hint">
          {{
            t("clipboard.historyLimitHelp", {
              min: CLIPBOARD_HISTORY_MIN_LIMIT,
              max: CLIPBOARD_HISTORY_MAX_LIMIT,
            })
          }}
        </p>
        <p v-if="statusText" class="field_status" :class="{ is_error: isError }">
          {{ statusText }}
        </p>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import {
  CLIPBOARD_HISTORY_LIMIT_STORAGE_KEY,
  CLIPBOARD_HISTORY_DEFAULT_LIMIT,
  CLIPBOARD_HISTORY_MIN_LIMIT,
  CLIPBOARD_HISTORY_MAX_LIMIT,
  normalizeHistoryLimit,
} from "@/clipboard/storage.js";

const { t } = useI18n();
const historyLimit = ref(CLIPBOARD_HISTORY_DEFAULT_LIMIT);
const saving = ref(false);
const statusText = ref("");
const isError = ref(false);

function setStatus(text, error = false) {
  statusText.value = text;
  isError.value = error;
}

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
  try {
    saving.value = true;
    historyLimit.value = normalizeHistoryLimit(historyLimit.value);
    await saveHistoryLimitToStorage(historyLimit.value);
    setStatus(t("clipboard.saveSuccess"));
  } catch (error) {
    setStatus(t("clipboard.saveFailed"), true);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadHistoryLimit();
});
</script>

<style scoped lang="scss">
.clipboard-description {
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.limit_row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field_hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.field_status {
  margin: 8px 0 0;
  font-size: 12px;
  color: #16a34a;
}

.field_status.is_error {
  color: #dc2626;
}
</style>
