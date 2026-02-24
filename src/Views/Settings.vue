<template>
  <div class="setting_group">
    <h2 class="title">{{ t("settings.title") }}</h2>
    <el-form :model="translationSettingsStore" ref="formRef" label-position="top" class="settings-form">
      <el-form-item :label="t('settings.apiKey')" prop="apiKey">
        <SaveableInput type="password" v-model="localApiKey" :label="t('settings.apiKeyForDeepSeek')"
          :placeholder="t('settings.apiKeyForDeepSeek')" @save="handleSaveAPIKey"
          :loading="apiStore.loadingStates?.apiKey || false" />
      </el-form-item>
      <el-form-item :label="t('settings.lokaliseApiToken')" prop="lokaliseApiToken">
        <SaveableInput type="password" v-model="localLokaliseToken" :label="t('settings.lokaliseApiToken')"
          :placeholder="t('settings.lokaliseApiTokenPlaceholder')" @save="handleSaveLokaliseApiToken"
          :loading="apiStore.loadingStates?.lokaliseApiToken || false" />
      </el-form-item>

      <el-form-item v-if="hasLokaliseToken" :label="t('settings.autoDeduplication')" label-position="top">
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
      <div v-if="hasLokaliseToken" class="embedding-control">
        <el-form-item :label="t('settings.AdTerms')" label-position="left" class="addTermsDict-container">
        </el-form-item>
        <div class="control-text">
          <LoadingButton :loading="refreshLoading" :text="t('terms.Refresh')" @click="handleRefreshTerms" />
          <LoadingButton :loading="rebuildLoading" :text="t('terms.BuildTermsEmbedding')"
            @click="handleBuildTermsEmbedding" />
        </div>
      </div>
      <div v-if="hasLokaliseToken" class="terms-single">
        <TermsCard :title="termsStore.termsTitle" :status="termsStore.termsStatus" :total-terms="termsStore.totalTerms"
          :loading="termsStore.termsLoading" :error="termsStore.termsError" :terms-data="editableTermsData"
          :embedding-status="termsStore.embeddingStatus" :last-embedding-time="termsStore.lastEmbeddingTime"
          :refresh-loading="refreshLoading" :library-loading="libraryLoading"
          @update:status="termsStore.updateTermStatus" @refresh="handleRefreshTerms"
          @fetchTermsData="termsStore.fetchTermsData" @addTerm="handleAddTerm" @deleteTerm="handleDeleteTerm"
          @updateTerm="handleUpdateTerm" />
      </div>
    </el-form>
    <h2 class="title">{{ t("settings.advancedSettings") }}</h2>
    <el-form-item :label="t('settings.translationTemperature')" label-position="left">
      <div class="translation-temperature">
        <el-input-number controls-position="right" v-model="translationSettingsStore.translationTemperature" :step="0.1"
          :min="0" :max="2" :precision="1" @change="handleTranslationTemperatureChange" />
      </div>
    </el-form-item>
    <el-form :model="translationSettingsStore" ref="formRef" label-position="top" class="settings-form">
      <el-form-item v-if="hasLokaliseToken" :label="t('termMatch.similarityThreshold')" label-position="left">
        <div class="similarity-threshold">
          <el-input-number controls-position="right" v-model="translationSettingsStore.similarityThreshold" :step="0.01"
            :min="0.5" :max="1" :precision="2" @change="handleSimilarityThresholdChange" />
        </div>
      </el-form-item>
      <el-form-item v-if="hasLokaliseToken" :label="t('termMatch.topK')" label-position="left">
        <div class="top-k">
          <el-input-number controls-position="right" v-model="translationSettingsStore.topK" :step="1" :min="1"
            :max="50" :precision="0" @change="handleTopKChange" />
        </div>
      </el-form-item>
      <el-form-item v-if="hasLokaliseToken" :label="t('termMatch.maxNGram')" label-position="left">
        <div class="max-ngram">
          <el-input-number controls-position="right" v-model="translationSettingsStore.maxNGram" :step="1" :min="1"
            :max="5" :precision="0" @change="handleMaxNGramChange" />
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
            <el-button @click="translationSettingsStore.dialogVisible = false">{{ t("common.cancel") }}</el-button>
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              {{ t("common.confirm") }}
            </el-button>
          </template>
        </el-dialog>
      </el-form-item>
    </el-form>

    <!-- 重建embedding确认�?-->
    <ConfirmDialog v-model="rebuildConfirmVisible" :title="t('terms.rebuildEmbedding')"
      :message="t('terms.rebuildEmbeddingCheck')" @confirm="handleRebuildConfirm" @cancel="handleRebuildCancel" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { ElDialog, ElMessage } from "element-plus";
import SaveableInput from "../Components/Common/SaveableInput.vue";
import ConfirmDialog from "../Components/Common/ConfirmDialog.vue";
import LoadingButton from "../Components/Common/LoadingButton.vue";
import { useI18n } from "../lokalise/composables/Core/useI18n.js";
import TermsCard from "../Components/Terms/TermsCard.vue";
import { useTranslationStorage } from "../lokalise/composables/Translation/useTranslationStorage.js";
// import { useCacheValidation } from "../lokalise/composables/Core/useCacheValidation.js"; // 如需要手动校验可取消注释
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

// 本地变量用于输入框，不直接绑定到store（避免输入时就显示功能）
const localApiKey = ref(apiStore.apiKey || "");
const localLokaliseToken = ref(apiStore.lokaliseApiToken || "");

// 检查是否配置了 Lokalise Token（只有保存成功后才会有值）
const hasLokaliseToken = computed(() => apiStore.hasLokaliseToken);

// 监听store变化，同步到本地变量（当store从localStorage初始化时�?
watch(
  () => apiStore.apiKey,
  (newValue) => {
    if (newValue !== localApiKey.value) {
      localApiKey.value = newValue || "";
    }
  }
);

watch(
  () => apiStore.lokaliseApiToken,
  (newValue) => {
    if (newValue !== localLokaliseToken.value) {
      localLokaliseToken.value = newValue || "";
    }
  }
);

// 直接使用store实例，不进行解构以保持响应式

// 处理自动去重卡片的点击事�?
const handleAutoDeduplicationClick = (event) => {
  // 如果点击的是开关本身，不处�?
  if (event.target.closest(".el-switch")) {
    return;
  }
  // 切换开关状�?
  const newState = !translationSettingsStore.autoDeduplication;
  translationSettingsStore.toggleAutoDeduplication(newState);
};

const formRef = ref();

// 添加缺失的事件处理函�?
const handleSaveAPIKey = async (saveData) => {
  await apiStore.saveApiKey(saveData);
  // 保存成功后，本地变量会自动通过watch同步，但为了确保一致性，也更新一�?
  localApiKey.value = apiStore.apiKey || "";
};

const handleSaveLokaliseApiToken = async (saveData) => {
  await apiStore.saveLokaliseApiToken(saveData);
  // 保存成功后，本地变量会自动通过watch同步，但为了确保一致性，也更新一�?
  localLokaliseToken.value = apiStore.lokaliseApiToken || "";
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


const handleDebugLoggingChange = (value) => {
  translationSettingsStore.toggleDebugLogging(value);
};

const handleTranslationTemperatureChange = (value) => {
  translationSettingsStore.updateTranslationTemperature(value);
};

const handleClearLocalStorage = () => {
  translationSettingsStore.dialogVisible = true;
};

const handleClearLocalStorageConfirm = () => {
  translationSettingsStore.clearAllSettings();
};

// 重建embedding确认框状�?
const rebuildConfirmVisible = ref(false);

// refresh loading状�?
const refreshLoading = ref(false);
const rebuildLoading = ref(false);
const libraryLoading = ref(false);

// 创建可编辑的terms数据
const editableTermsData = ref([]);

// 监听原始数据变化，同步到可编辑数�?
watch(
  () => termsStore.termsData,
  (newData) => {
    // 深拷贝数据并添加编辑状�?
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

    // 只提交改动的terms数据（使用统一的addUserTerms接口�?
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
    // 错误消息已经�?rebuildEmbedding 方法中处理了，这里只需要记录日�?
    console.error("Rebuild embedding failed:", error);
  }
};

// 处理重建取消
const handleRebuildCancel = () => {
  // 用户取消操作，不需要处�?
};

// 处理refresh，添加loading状�?
const handleRefreshTerms = async (showSuccessMessage = true) => {
  try {
    libraryLoading.value = true;
    await termsStore.refreshTerms(showSuccessMessage);
  } catch (error) {
    console.error("Refresh terms failed:", error);
  } finally {
    libraryLoading.value = false;
  }
};

// 处理TermsCard的事�?
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
  const index = editableTermsData.value.findIndex(
    (t) => t === term || t.term_id === term.term_id
  );
  if (index !== -1) {
    editableTermsData.value.splice(index, 1);
  }
};

const handleUpdateTerm = (term, field, value) => {
  const index = editableTermsData.value.findIndex(
    (t) => t === term || t.term_id === term.term_id
  );
  if (index !== -1) {
    editableTermsData.value[index][field] = value;
  }
};

// 初始化Terms状�?
onMounted(async () => {
  try {
    // 设置library loading状�?
    libraryLoading.value = true;

    // 初始化设�?
    apiStore.initializeApiSettings();
    translationSettingsStore.initializeTranslationSettings();

    // 初始化本地变量（从store读取已保存的值）
    localApiKey.value = apiStore.apiKey || "";
    localLokaliseToken.value = apiStore.lokaliseApiToken || "";

    // Debug: Log store state
    debugLog("API Store State:", {
      apiKey: apiStore.apiKey,
      lokaliseApiToken: apiStore.lokaliseApiToken,
      loadingStates: apiStore.loadingStates,
    });

    // 初始化Terms状�?
    termsStore.initializeTermsStatus(); // 初始化术语库开关状�?
    await termsStore.refreshTerms(false); // 不显示成功消�?
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  } finally {
    // 无论成功还是失败，都要关闭loading状�?
    libraryLoading.value = false;
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

/* 按钮容器样式 - 右对�?*/
.button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
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

  // 按钮样式�?LoadingButton 组件处理
}

// Loading 按钮样式�?LoadingButton 组件处理</style>

