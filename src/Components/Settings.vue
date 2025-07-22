<template>
  <div class="setting_group">
    <h2 class="title">Lokalise Settings</h2>
    <el-form :model="formData" ref="formRef" label-position="top" class="settings-form">
      <el-form-item label="API Key" prop="apiKey">
        <SaveableInput v-model="formData.apiKey" label="API Key for DeepSeek" placeholder="API Key for DeepSeek"
          @save="handleSaveAPIKey" :loading="loadingStates.apiKey" />
      </el-form-item>
      <el-form-item label="Lokalise Project Upload URL" prop="uploadUrl">
        <SaveableInput v-model="formData.uploadUrl" label="Lokalise Project Upload URL"
          placeholder="https://app.lokalise.com/upload/..." @save="handleSaveLokaliseURL"
          :loading="loadingStates.url" />
      </el-form-item>
      <div class="custom-translation-prompt">
        <el-form-item label="Custom Translation Prompt" label-position="left">
        </el-form-item>
        <el-switch v-model="formData.translationPrompt" width="45px" />
      </div>
      <el-form-item v-if="formData.translationPrompt">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item v-if="formData.translationPrompt">
        <div class="button-container">
          <el-button v-show="isCodeEditing" type="primary" @click="handleSavePrompt" :loading="loadingStates.prompt">
            Save
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <h2 class="title">Advanced Settings</h2>
    <el-form :model="formData" ref="formRef" label-position="top" class="settings-form">
      <el-form-item label="Clear Local Storage" label-position="left">
        <div class="localStorageClear">
          <el-button type="primary" @click="handleClearLocalStorage">
            Clear
          </el-button>
        </div>
        <el-dialog v-model="dialogVisible" title="Clear Local Storage" width="30%" align-center>
          <span>Are you sure you want to clear local storage?</span>
          <template #footer>
            <el-button @click="dialogVisible = false">Cancel</el-button>
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              Confirm
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

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

// 使用设置管理composable
const {
  loadingStates,
  codeContent,
  dialogVisible,
  formData,
  isCodeEditing,
  handleSaveAPIKey,
  handleSaveLokaliseURL,
  handleSavePrompt,
  handleClearLocalStorage,
  handleClearLocalStorageConfirm,
} = useSettings();

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

.localStorageClear {
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
</style>
