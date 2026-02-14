<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form label-position="top" class="settings-form">
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
import { onMounted, ref } from "vue";
import { useI18n } from "../composables/Core/useI18n.js";
import { useTranslationSettingsStore } from "../stores/settings/translation.js";
import {
  TTS_VOICE_TYPES,
  STORAGE_KEYS,
  DEFAULT_VOICE_TYPE,
} from "../translate/config/tts.js";

const { t } = useI18n();
const translationSettingsStore = useTranslationSettingsStore();
const ttsVoices = ref([]);
const ttsVoiceType = ref(DEFAULT_VOICE_TYPE);

onMounted(() => {
  ttsVoices.value = TTS_VOICE_TYPES;
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get([STORAGE_KEYS.VOICE_TYPE], (out) => {
      if (out[STORAGE_KEYS.VOICE_TYPE]) ttsVoiceType.value = out[STORAGE_KEYS.VOICE_TYPE];
    });
  }
});

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
