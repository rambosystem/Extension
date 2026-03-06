<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form label-position="top" class="settings-form">
      <el-form-item
        :label="t('clipboard.openFavoritesPopup')"
        label-position="left"
      >
        <div class="shortcut-setting-row" @click="openShortcutSettings">
          <span class="shortcut-key-chip">{{ shortcutDisplay }}</span>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";

const { t } = useI18n();
defineProps({
  title: {
    type: String,
    required: true,
  },
});
const shortcutValue = ref("");
const shortcutDisplay = computed(() => {
  if (!shortcutValue.value) return t("clipboard.shortcutEmpty");
  return shortcutValue.value;
});

function loadShortcutState() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.commands?.getAll) {
      resolve();
      return;
    }
    chrome.commands.getAll((commands) => {
      const cmd = Array.isArray(commands)
        ? commands.find((item) => item?.name === "open-clipboard-popup")
        : null;
      shortcutValue.value = cmd?.shortcut || "";
      resolve();
    });
  });
}

onMounted(async () => {
  await loadShortcutState();
});

function openShortcutSettings() {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) return;
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
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

.shortcut-setting-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  user-select: none;
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

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
