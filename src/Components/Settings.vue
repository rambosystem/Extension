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
      <div class="embedding-control">
        <el-form-item :label="t('settings.AdTerms')" label-position="left" class="addTermsDict-container">
        </el-form-item>
        <div class="control-text">
          <LoadingButton :loading="refreshLoading" :text="t('terms.Refresh')" @click="handleRefreshTerms" />
          <LoadingButton :loading="rebuildLoading" :text="t('terms.BuildTermsEmbedding')"
            @click="handleBuildTermsEmbedding" />
        </div>
      </div>
      <div class="terms-single">
        <TermsCard :title="termsTitle" :status="termsStatus" :total-terms="totalTerms" :loading="termsLoading"
          :error="termsError" :terms-data="editableTermsData" :embedding-status="embeddingStatus"
          :last-embedding-time="lastEmbeddingTime" :refresh-loading="refreshLoading" @update:status="updateTermStatus"
          @refresh="handleRefreshTerms" @fetchTermsData="fetchTermsData" />
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

    <!-- 重建embedding确认框 -->
    <ConfirmDialog v-model="rebuildConfirmVisible" :title="t('terms.rebuildEmbedding')"
      :message="t('terms.rebuildEmbeddingCheck')" @confirm="handleRebuildConfirm" @cancel="handleRebuildCancel" />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElDialog, ElMessage } from "element-plus";
import CodeEditor from "./CodeEditor.vue";
import SaveableInput from "./SaveableInput.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import LoadingButton from "./LoadingButton.vue";
import { useSettings } from "../composables/useSettings.js";
import { useI18n } from "../composables/useI18n.js";
import TermsCard from "./TermsCard.vue";
import { useTermsManager } from "../composables/useTermsManager.js";
import { useTranslationStorage } from "../composables/useTranslationStorage.js";

const { t } = useI18n();
const {
  termsStatus,
  termsTitle,
  totalTerms,
  termsData: originalTermsData,
  loading: termsLoading,
  error: termsError,
  embeddingStatus,
  lastEmbeddingTime,
  updateTermStatus,
  refreshTerms,
  fetchTermsData,
  addTerms,
  rebuildEmbedding,
  hasChanges,
  getChangedTerms,
  reinitializeStatus
} = useTermsManager();

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

// 重建embedding确认框状态
const rebuildConfirmVisible = ref(false);

// refresh loading状态
const refreshLoading = ref(false);
const rebuildLoading = ref(false);

// 创建可编辑的terms数据
const editableTermsData = ref([]);

// 监听原始数据变化，同步到可编辑数据
watch(originalTermsData, (newData) => {
  // 深拷贝数据并添加编辑状态
  const { addEditingStates } = useTranslationStorage();
  editableTermsData.value = addEditingStates(JSON.parse(JSON.stringify(newData)));
}, { deep: true });

// 处理terms提交
const handleSubmitTerms = async () => {
  try {
    // 比较可编辑数据与原始数据
    const hasChanges = JSON.stringify(editableTermsData.value) !== JSON.stringify(originalTermsData.value);

    if (!hasChanges) {
      ElMessage.warning(t("terms.noChanges"));
      return;
    }

    // 获取改动的terms数据
    const changedTerms = getChangedTerms(editableTermsData.value, originalTermsData.value);

    if (changedTerms.length === 0) {
      ElMessage.warning(t("terms.noChanges"));
      return;
    }

    // 只提交改动的terms数据（使用统一的addUserTerms接口）
    await addTerms(changedTerms);

    // 更新原始数据
    refreshTerms();

  } catch (error) {
    console.error("Submit terms failed:", error);
  }
};

// 处理重建embedding
const handleBuildTermsEmbedding = () => {
  rebuildConfirmVisible.value = true;
};

// 处理重建确认
const handleRebuildConfirm = async () => {
  rebuildLoading.value = true;
  try {
    await rebuildEmbedding();
  } catch (error) {
    // 错误消息已经在 rebuildEmbedding 方法中处理了，这里只需要记录日志
    console.error('Rebuild embedding failed:', error);
  } finally {
    rebuildLoading.value = false;
  }
};

// 处理重建取消
const handleRebuildCancel = () => {
  // 用户取消操作，不需要处理
};

// 处理refresh，添加loading状态
const handleRefreshTerms = async (showSuccessMessage = true) => {
  refreshLoading.value = true;
  try {
    await refreshTerms(showSuccessMessage);
  } catch (error) {
    console.error('Refresh terms failed:', error);
  } finally {
    refreshLoading.value = false;
  }
};

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

.terms-single {
  width: 100%;
  margin-bottom: 20px;
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

.addTermsDict-container {
  margin-bottom: 5px;
  width: 100%;
}

.embedding-control {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}

.control-text {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
  color: #409EFF;
  font-size: 14px;
  margin-right: 5px;
  gap: 20px;

  // 按钮样式现在由 LoadingButton 组件处理
}

// Loading 按钮样式现在由 LoadingButton 组件处理</style>
