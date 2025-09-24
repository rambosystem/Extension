<template>
  <div class="setting_group">
    <h2 class="title">{{ t("settings.title") }}</h2>
    <el-form :model="translationSettingsStore" ref="formRef" label-position="top" class="settings-form">
      <el-form-item :label="t('settings.apiKey')" prop="apiKey">
        <SaveableInput v-model="apiStore.apiKey" :label="t('settings.apiKeyForDeepSeek')"
          :placeholder="t('settings.apiKeyForDeepSeek')" @save="handleSaveAPIKey"
          :loading="apiStore.loadingStates?.apiKey || false" />
      </el-form-item>
      <el-form-item :label="t('settings.lokaliseApiToken')" prop="lokaliseApiToken">
        <SaveableInput v-model="apiStore.lokaliseApiToken" :label="t('settings.lokaliseApiToken')"
          placeholder="Enter your Lokalise API token..." @save="handleSaveLokaliseApiToken"
          :loading="apiStore.loadingStates?.lokaliseApiToken || false" />
      </el-form-item>

      <el-form-item :label="t('settings.autoDeduplication')" label-position="top">
        <el-card shadow="never" style="width: 100%" body-style="padding: 16px 20px; cursor: pointer;"
          @click="handleAutoDeduplicationClick">
          <div class="auto-deduplication">
            <span class="auto-deduplication-text">{{
              t("settings.autoDeduplicationLabel")
            }}</span>
            <el-switch :model-value="translationSettingsStore.autoDeduplication"
              @update:model-value="handleAutoDeduplicationChange" @click.stop width="45px" />
          </div>
        </el-card>
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
        <TermsCard :title="termsStore.termsTitle" :status="termsStore.termsStatus" :total-terms="termsStore.totalTerms"
          :loading="termsStore.termsLoading" :error="termsStore.termsError" :terms-data="editableTermsData"
          :embedding-status="termsStore.embeddingStatus" :last-embedding-time="termsStore.lastEmbeddingTime"
          :refresh-loading="refreshLoading" @update:status="termsStore.updateTermStatus" @refresh="handleRefreshTerms"
          @fetchTermsData="termsStore.fetchTermsData" @addTerm="handleAddTerm" @deleteTerm="handleDeleteTerm"
          @updateTerm="handleUpdateTerm" />
      </div>
      <el-form-item :label="t('settings.translationPrompt')" label-position="top">
        <el-card shadow="never" style="width: 100%" body-style="padding: 16px 20px; cursor: pointer;"
          @click="handleTranslationPromptClick">
          <div class="custom-translation-prompt">
            <span class="custom-translation-prompt-text">{{
              t("settings.customTranslationPrompt")
            }}</span>
            <el-switch :model-value="translationSettingsStore.translationPrompt"
              @update:model-value="handleTranslationPromptChange" @click.stop width="45px" />
          </div>
        </el-card>
      </el-form-item>
      <el-form-item v-if="translationSettingsStore.translationPrompt">
        <div class="CodeEditor">
          <CodeEditor v-model="translationSettingsStore.customPrompt"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item v-if="translationSettingsStore.translationPrompt">
        <div class="button-container">
          <el-button v-show="translationSettingsStore.isCodeEditing" type="primary" @click="handleSavePrompt"
            :loading="translationSettingsStore.loadingStates?.prompt || false">
            {{ t("common.save") }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <h2 class="title">{{ t("settings.advancedSettings") }}</h2>
    <el-form-item :label="t('settings.translationTemperature')" label-position="left">
      <div class="translation-temperature">
        <el-input-number controls-position="right" v-model="translationSettingsStore.translationTemperature" :step="0.1"
          :min="0" :max="2" :precision="1" @change="handleTranslationTemperatureChange" />
      </div>
    </el-form-item>
    <el-form :model="translationSettingsStore" ref="formRef" label-position="top" class="settings-form">
      <el-form-item :label="t('termMatch.similarityThreshold')" label-position="left">
        <div class="similarity-threshold">
          <el-input-number controls-position="right" v-model="translationSettingsStore.similarityThreshold" :step="0.01"
            :min="0.5" :max="1" :precision="2" @change="handleSimilarityThresholdChange" />
        </div>
      </el-form-item>
      <el-form-item :label="t('termMatch.topK')" label-position="left">
        <div class="top-k">
          <el-input-number controls-position="right" v-model="translationSettingsStore.topK" :step="1" :min="1"
            :max="50" :precision="0" @change="handleTopKChange" />
        </div>
      </el-form-item>
      <el-form-item :label="t('termMatch.maxNGram')" label-position="left">
        <div class="max-ngram">
          <el-input-number controls-position="right" v-model="translationSettingsStore.maxNGram" :step="1" :min="1"
            :max="5" :precision="0" @change="handleMaxNGramChange" />
        </div>
      </el-form-item>
      <el-form-item :label="t('settings.language')" label-position="left">
        <div class="language-select">
          <el-select v-model="appStore.language" @change="handleLanguageChange" style="width: 160px">
            <el-option label="English" value="en" />
            <el-option label="中文" value="zh_CN" />
          </el-select>
        </div>
      </el-form-item>
      <el-form-item :label="t('settings.debugLogging')" label-position="left">
        <div class="debug-logging-setting">
          <el-switch v-model="translationSettingsStore.debugLogging" @change="handleDebugLoggingChange" width="45px" />
        </div>
      </el-form-item>
      <el-form-item :label="t('settings.clearLocalStorage')" label-position="left">
        <div class="localStorageClear">
          <el-button type="primary" @click="handleClearLocalStorage">
            {{ t("common.clear") }}
          </el-button>
        </div>
        <el-dialog v-model="translationSettingsStore.dialogVisible" :title="t('settings.clearLocalStorage')" width="30%"
          align-center>
          <span>{{ t("settings.clearLocalStorageConfirm") }}</span>
          <template #footer>
            <el-button @click="translationSettingsStore.dialogVisible = false">{{
              t("common.cancel")
              }}</el-button>
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              {{ t("common.confirm") }}
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
import { ref, watch, onMounted } from "vue";
import { ElDialog, ElMessage } from "element-plus";
import CodeEditor from "../Components/Common/CodeEditor.vue";
import SaveableInput from "../Components/Common/SaveableInput.vue";
import ConfirmDialog from "../Components/Common/ConfirmDialog.vue";
import LoadingButton from "../Components/Common/LoadingButton.vue";
import { useI18n } from "../composables/Core/useI18n.js";
import TermsCard from "../Components/Terms/TermsCard.vue";
import { useTranslationStorage } from "../composables/Translation/useTranslationStorage.js";
import { useApiStore } from "../stores/settings/api.js";
import { useTranslationSettingsStore } from "../stores/settings/translation.js";
import { useTermsStore } from "../stores/terms.js";
import { useAppStore } from "../stores/app.js";
import { debugLog } from "../utils/debug.js";

const { t } = useI18n();

// 使用Pinia stores
const apiStore = useApiStore();
const translationSettingsStore = useTranslationSettingsStore();
const termsStore = useTermsStore();
const appStore = useAppStore();

// 直接使用store实例，不进行解构以保持响应式

// 处理翻译提示卡片的点击事件
const handleTranslationPromptClick = (event) => {
  // 如果点击的是开关本身，不处理
  if (event.target.closest(".el-switch")) {
    return;
  }
  // 切换开关状态
  const newState = !translationSettingsStore.translationPrompt;
  translationSettingsStore.toggleTranslationPrompt(newState);
};

// 处理自动去重卡片的点击事件
const handleAutoDeduplicationClick = (event) => {
  // 如果点击的是开关本身，不处理
  if (event.target.closest(".el-switch")) {
    return;
  }
  // 切换开关状态
  const newState = !translationSettingsStore.autoDeduplication;
  translationSettingsStore.toggleAutoDeduplication(newState);
};

const formRef = ref();

// 添加缺失的事件处理函数
const handleSaveAPIKey = async (saveData) => {
  await apiStore.saveApiKey(saveData);
};

const handleSaveLokaliseApiToken = async (saveData) => {
  await apiStore.saveLokaliseApiToken(saveData);
};

const handleSavePrompt = async () => {
  await translationSettingsStore.saveCustomPrompt();
};

const handleTranslationPromptChange = (value) => {
  translationSettingsStore.toggleTranslationPrompt(value);
};

const handleAutoDeduplicationChange = (value) => {
  translationSettingsStore.toggleAutoDeduplication(value);
};

const handleSimilarityThresholdChange = (value) => {
  translationSettingsStore.updateSimilarityThreshold(value);
};

const handleTopKChange = (value) => {
  translationSettingsStore.updateTopK(value);
};

const handleMaxNGramChange = (value) => {
  translationSettingsStore.updateMaxNGram(value);
};

const handleLanguageChange = (value) => {
  appStore.setLanguage(value);
};

const handleDebugLoggingChange = (value) => {
  translationSettingsStore.toggleDebugLogging(value);
};

const handleTranslationTemperatureChange = (value) => {
  translationSettingsStore.updateTranslationTemperature(value);
};

const handleClearLocalStorage = () => {
  translationSettingsStore.dialogVisible = true;
};

const handleClearLocalStorageConfirm = async () => {
  await translationSettingsStore.clearAllSettings();
};

// 重建embedding确认框状态
const rebuildConfirmVisible = ref(false);

// refresh loading状态
const refreshLoading = ref(false);
const rebuildLoading = ref(false);

// 创建可编辑的terms数据
const editableTermsData = ref([]);

// 监听原始数据变化，同步到可编辑数据
watch(
  () => termsStore.termsData,
  (newData) => {
    // 深拷贝数据并添加编辑状态
    const { addEditingStates } = useTranslationStorage();
    editableTermsData.value = addEditingStates(
      JSON.parse(JSON.stringify(newData))
    );
  },
  { deep: true }
);

// 处理terms提交
const handleSubmitTerms = async () => {
  try {
    // 比较可编辑数据与原始数据
    const hasChanges =
      JSON.stringify(editableTermsData.value) !==
      JSON.stringify(termsStore.termsData);

    if (!hasChanges) {
      ElMessage.warning(t("terms.noChanges"));
      return;
    }

    // 获取改动的terms数据
    const changedTerms = termsStore.getChangedTerms(
      editableTermsData.value,
      termsStore.termsData
    );

    if (changedTerms.length === 0) {
      ElMessage.warning(t("terms.noChanges"));
      return;
    }

    // 只提交改动的terms数据（使用统一的addUserTerms接口）
    await termsStore.addTerms(changedTerms);

    // 更新原始数据
    termsStore.refreshTerms();
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
  try {
    await termsStore.rebuildEmbedding();
  } catch (error) {
    // 错误消息已经在 rebuildEmbedding 方法中处理了，这里只需要记录日志
    console.error("Rebuild embedding failed:", error);
  }
};

// 处理重建取消
const handleRebuildCancel = () => {
  // 用户取消操作，不需要处理
};

// 处理refresh，添加loading状态
const handleRefreshTerms = async (showSuccessMessage = true) => {
  try {
    await termsStore.refreshTerms(showSuccessMessage);
  } catch (error) {
    console.error("Refresh terms failed:", error);
  }
};

// 处理TermsCard的事件
const handleAddTerm = (newTerm) => {
  editableTermsData.value.unshift(newTerm);
  // 自动进入第一行的编辑模式
  setTimeout(() => {
    if (editableTermsData.value.length > 0) {
      editableTermsData.value[0].editing_en = true;
    }
  }, 100);
};

const handleDeleteTerm = (term) => {
  const index = editableTermsData.value.findIndex(t => t === term || t.term_id === term.term_id);
  if (index !== -1) {
    editableTermsData.value.splice(index, 1);
  }
};

const handleUpdateTerm = (term, field, value) => {
  const index = editableTermsData.value.findIndex(t => t === term || t.term_id === term.term_id);
  if (index !== -1) {
    editableTermsData.value[index][field] = value;
  }
};

// 初始化Terms状态
onMounted(async () => {
  try {
    // 初始化设置
    apiStore.initializeApiSettings();
    translationSettingsStore.initializeTranslationSettings();

    // Debug: Log store state
    debugLog('API Store State:', {
      apiKey: apiStore.apiKey,
      lokaliseApiToken: apiStore.lokaliseApiToken,
      loadingStates: apiStore.loadingStates
    });

    // 初始化Terms状态
    termsStore.initializeTermsStatus(); // 初始化术语库开关状态
    await termsStore.refreshTerms(false); // 不显示成功消息
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
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
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  line-height: 1;
  display: flex;
  align-items: center;
}

.auto-deduplication {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auto-deduplication-text {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  line-height: 1;
  display: flex;
  align-items: center;
}

.language-select,
.similarity-threshold,
.top-k,
.max-ngram,
.debug-logging-setting,
.translation-temperature {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;

  .el-input-number {
    width: 160px;
    color: #606266;
  }

}

.addTermsDict-container {
  margin-bottom: 5px;
  flex: 1;
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
  color: #409eff;
  font-size: 14px;
  margin-right: 5px;
  gap: 20px;

  // 按钮样式由 LoadingButton 组件处理
}

// Loading 按钮样式由 LoadingButton 组件处理</style>
