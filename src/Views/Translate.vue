<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form label-position="top" class="settings-form">
      <el-form-item
        :label="t('Translate.openTranslatePopup')"
        label-position="left"
      >
        <div class="shortcut-setting-row" @click="openShortcutSettings">
          <span class="shortcut-key-chip">{{ shortcutDisplay }}</span>
        </div>
      </el-form-item>

      <el-form-item :label="t('Translate.selectToTranslate')" label-position="left">
        <div class="select-to-translate-setting">
          <el-switch :model-value="translationSettingsStore.wordSelectionTranslate"
            @update:model-value="handleSelectToTranslateChange" width="45px" />
        </div>
      </el-form-item>

      <el-form-item :label="t('Translate.selectTTS')" label-position="left">
        <div class="tts-voice-select">
          <el-select v-model="ttsVoiceType" :placeholder="t('Translate.selectTTSPlaceholder')" filterable
            @change="saveTtsVoiceType">
            <el-option-group v-for="group in ttsVoices" :key="group.label" :label="group.label">
              <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value" />
            </el-option-group>
          </el-select>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import { useTranslationSettingsStore } from "@/lokalise/stores/settings/translation.js";
import {
  TTS_VOICE_TYPES,
  STORAGE_KEYS,
  DEFAULT_VOICE_TYPE,
} from "@/translate/config/tts.js";

const { t } = useI18n();
const translationSettingsStore = useTranslationSettingsStore();
const ttsVoices = ref([]);
const ttsVoiceType = ref(DEFAULT_VOICE_TYPE);
const shortcutValue = ref("");
const shortcutDisplay = computed(() => {
  if (!shortcutValue.value) return t("Translate.shortcutEmpty");
  return shortcutValue.value;
});

onMounted(() => {
  ttsVoices.value = TTS_VOICE_TYPES;
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get([STORAGE_KEYS.VOICE_TYPE], (out) => {
      if (out[STORAGE_KEYS.VOICE_TYPE]) ttsVoiceType.value = out[STORAGE_KEYS.VOICE_TYPE];
    });
  }
});

function loadShortcutState() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.commands?.getAll) {
      resolve();
      return;
    }
    chrome.commands.getAll((commands) => {
      const cmd = Array.isArray(commands)
        ? commands.find((item) => item?.name === "open-translate-popup")
        : null;
      shortcutValue.value = cmd?.shortcut || "";
      resolve();
    });
  });
}

function saveTtsVoiceType(value) {
  if (typeof chrome !== "undefined" && chrome.storage?.local?.set) {
    chrome.storage.local.set({ [STORAGE_KEYS.VOICE_TYPE]: value });
  }
}

const handleSelectToTranslateChange = (value) => {
  translationSettingsStore.toggleWordSelectionTranslate(value);
};

onMounted(() => {
  translationSettingsStore.initializeTranslationSettings();
});

onMounted(async () => {
  await loadShortcutState();
});

function openShortcutSettings() {
  if (typeof chrome === "undefined" || !chrome.tabs?.create) return;
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
}

defineProps({
  title: {
    type: String,
    required: true,
  },
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

.select-to-translate-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.tts-voice-select {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;

  .el-select {
    width: 200px;
    color: #606266;
  }
}
</style>

