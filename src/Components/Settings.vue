<template>
  <div class="setting_group">
    <h2 class="title">{{ t('settings.title') }}</h2>
    <el-form :model="stringStates" ref="formRef" label-position="top" class="settings-form">
      <el-form-item :label="t('settings.apiKey')" prop="apiKey">
        <SaveableInput v-model="stringStates.apiKey" :label="t('settings.apiKeyForDeepSeek')"
          :placeholder="t('settings.apiKeyForDeepSeek')" @save="handleSaveAPIKey" :loading="loadingStates.apiKey" />
      </el-form-item>
      <el-form-item :label="t('settings.lokaliseProjectUploadURL')" prop="uploadUrl">
        <SaveableInput v-model="stringStates.uploadUrl" :label="t('settings.lokaliseProjectUploadURL')"
          placeholder="https://app.lokalise.com/upload/..." @save="handleSaveLokaliseURL"
          :loading="loadingStates.url" />
      </el-form-item>
      <el-form-item :label="t('settings.AdTerms')" label-position="left" class="addTermsDict-container">
        <div class="addTermsDict">
          <span class="addTermsDict-text">{{ t('settings.addTermsDict') }}</span>
        </div>
      </el-form-item>
      <div :class="['terms-grid', { 'terms-grid-single': adTermsList.length === 1 }]">
        <TermsCard v-for="item in adTermsList" :key="item.id" :item="item"
          @update:status="(value) => updateTermStatus(item.id, value)" />
      </div>
      <el-form-item :label="t('settings.translationPrompt')" label-position="top">
        <el-card shadow="never" style="width: 100%;" body-style="padding: 16px 20px; cursor: pointer;"
          @click="handleTranslationPromptClick">
          <div class="custom-translation-prompt">
            <span class="custom-translation-prompt-text">{{ t('settings.customTranslationPrompt') }}</span>
            <el-switch :model-value="booleanStates.translationPrompt"
              @update:model-value="handleTranslationPromptChange" @click.stop width="45px" />
          </div>
        </el-card>
      </el-form-item>
      <el-form-item v-if="booleanStates.translationPrompt">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item v-if="booleanStates.translationPrompt">
        <div class="button-container">
          <el-button v-show="booleanStates.isCodeEditing" type="primary" @click="handleSavePrompt"
            :loading="loadingStates.prompt">
            {{ t('common.save') }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <h2 class="title">{{ t('settings.advancedSettings') }}</h2>
    <el-form :model="stringStates" ref="formRef" label-position="top" class="settings-form">
      <el-form-item :label="t('settings.language')" label-position="left">
        <div class="language-select">
          <el-select v-model="stringStates.language" @change="handleLanguageChange" style="width: 160px">
            <el-option label="English" value="en" />
            <el-option label="中文" value="zh_CN" />
          </el-select>
        </div>
      </el-form-item>
      <el-form-item :label="t('settings.clearLocalStorage')" label-position="left">
        <div class="localStorageClear">
          <el-button type="primary" @click="handleClearLocalStorage">
            {{ t('common.clear') }}
          </el-button>
        </div>
        <el-dialog v-model="dialogVisible" :title="t('settings.clearLocalStorage')" width="30%" align-center>
          <span>{{ t('settings.clearLocalStorageConfirm') }}</span>
          <template #footer>
            <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              {{ t('common.confirm') }}
            </el-button>
          </template>
        </el-dialog>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElDialog } from "element-plus";
import CodeEditor from "./CodeEditor.vue";
import SaveableInput from "./SaveableInput.vue";
import { useSettings } from "../composables/useSettings.js";
import { useI18n } from "../composables/useI18n.js";
import TermsCard from "./TermsCard.vue";
import { useTermsManager } from "../composables/useTermsManger.js";

const { t } = useI18n();
const { adTermsList, updateTermStatus } = useTermsManager();

// 使用设置管理composable
const {
  loadingStates,
  codeContent,
  dialogVisible,
  stringStates,
  booleanStates,
  handleSaveAPIKey,
  handleSaveLokaliseURL,
  handleSavePrompt,
  handleClearLocalStorage,
  handleClearLocalStorageConfirm,
  handleTranslationPromptChange,
  handleLanguageChange,
} = useSettings();

// 处理翻译提示卡片的点击事件
const handleTranslationPromptClick = (event) => {
  // 如果点击的是开关本身，不处理
  if (event.target.closest('.el-switch')) {
    return;
  }
  // 切换开关状态
  const newState = !booleanStates.translationPrompt;
  handleTranslationPromptChange(newState);
};

const formRef = ref();
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

.localStorageClear,
.addTermsDict {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}

/* CodeEditor 包装容器样式 */
.CodeEditor {
  width: 100%;
}

/* 按钮容器样式 - 右对齐 */
.button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

/* CodeEditor 样式调整 - 更好的解决方案 */
:deep(.el-form-item__content) {
  .cm-editor {
    width: 100%;
  }
}

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}

.custom-translation-prompt {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-translation-prompt-text {
  font-weight: 500;
  font-size: 16px;
  color: #606266;
}

.language-select {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.terms-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
  margin-bottom: 20px;
}

.terms-grid-single {
  grid-template-columns: 1fr;
  width: 100%;
  margin-bottom: 20px;
}

.addTermsDict-text {
  font-size: 14px;
  color: #409eff;
  cursor: pointer;
}

.addTermsDict-text:hover {
  text-decoration: underline;
}

.addTermsDict-container {
  margin-bottom: 5px;
}
</style>
