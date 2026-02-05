<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>
    <el-form label-position="top" class="settings-form">
      <el-form-item :label="t('Translate.selectToTranslate')" label-position="top">
        <el-card
          shadow="never"
          style="width: 100%"
          body-style="padding: 16px 20px; cursor: pointer;"
          @click="handleSelectToTranslateClick"
        >
          <div class="select-to-translate">
            <span class="select-to-translate-text">{{
              t("Translate.selectToTranslate")
            }}</span>
            <el-switch
              :model-value="translationSettingsStore.wordSelectionTranslate"
              @update:model-value="handleSelectToTranslateChange"
              @click.stop
              width="45px"
            />
          </div>
        </el-card>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useI18n } from "../composables/Core/useI18n.js";
import { useTranslationSettingsStore } from "../stores/settings/translation.js";

const { t } = useI18n();
const translationSettingsStore = useTranslationSettingsStore();

const handleSelectToTranslateClick = (event) => {
  if (event.target.closest(".el-switch")) {
    return;
  }
  const newState = !translationSettingsStore.wordSelectionTranslate;
  translationSettingsStore.toggleWordSelectionTranslate(newState);
};

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

.select-to-translate {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.select-to-translate-text {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  line-height: 1;
  display: flex;
  align-items: center;
}
</style>
