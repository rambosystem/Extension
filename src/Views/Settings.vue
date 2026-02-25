<template>
  <div class="setting_group">
    <h2 class="title">{{ t("settings.title") }}</h2>
    <el-form
      :model="translationSettingsStore"
      ref="formRef"
      label-position="top"
      class="settings-form"
    >
      <el-form-item :label="t('settings.apiKey')" prop="apiKey">
        <SaveableInput
          type="password"
          v-model="localApiKey"
          :label="t('settings.apiKeyForDeepSeek')"
          :placeholder="t('settings.apiKeyForDeepSeek')"
          @save="handleSaveAPIKey"
          :loading="apiStore.loadingStates?.apiKey || false"
        />
      </el-form-item>
    </el-form>
    <h2 class="title">{{ t("settings.advancedSettings") }}</h2>
    <el-form
      :model="translationSettingsStore"
      ref="formRef"
      label-position="top"
      class="settings-form"
    >
      <el-form-item :label="t('settings.debugLogging')" label-position="left">
        <div class="debug-logging-setting">
          <el-switch
            v-model="translationSettingsStore.debugLogging"
            @change="handleDebugLoggingChange"
            width="45px"
          />
        </div>
      </el-form-item>
      <el-form-item
        :label="t('settings.clearLocalStorage')"
        label-position="left"
      >
        <div class="localStorageClear">
          <el-button type="primary" @click="handleClearLocalStorage">
            {{ t("common.clear") }}
          </el-button>
        </div>
        <el-dialog
          v-model="translationSettingsStore.dialogVisible"
          :title="t('settings.clearLocalStorage')"
          width="30%"
          align-center
        >
          <span>{{ t("settings.clearLocalStorageConfirm") }}</span>
          <template #footer>
            <el-button
              @click="translationSettingsStore.dialogVisible = false"
              >{{ t("common.cancel") }}</el-button
            >
            <el-button type="primary" @click="handleClearLocalStorageConfirm">
              {{ t("common.confirm") }}
            </el-button>
          </template>
        </el-dialog>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { ElDialog } from "element-plus";
import SaveableInput from "../components/common/SaveableInput.vue";
import { useI18n } from "../lokalise/composables/Core/useI18n.js";
import { useApiStore } from "../lokalise/stores/settings/api.js";
import { useTranslationSettingsStore } from "../lokalise/stores/settings/translation.js";
import { clearAllSettings } from "../lokalise/services/settings/translationSettingsOrchestrator.js";
import { debugLog } from "../utils/debug.js";

const { t } = useI18n();

// 使用Pinia stores
const apiStore = useApiStore();
const translationSettingsStore = useTranslationSettingsStore();

// 本地变量用于输入框，不直接绑定到store（避免输入时就显示功能）
const localApiKey = ref(apiStore.apiKey || "");

// 监听store变化，同步到本地变量（当store从localStorage初始化时）
watch(
  () => apiStore.apiKey,
  (newValue) => {
    if (newValue !== localApiKey.value) {
      localApiKey.value = newValue || "";
    }
  },
);

const formRef = ref();

// 添加缺失的事件处理函�?
const handleSaveAPIKey = async (saveData) => {
  await apiStore.saveApiKey(saveData);
  // 保存成功后，本地变量会自动通过watch同步，但为了确保一致性，也更新一�?
  localApiKey.value = apiStore.apiKey || "";
};

const handleDebugLoggingChange = (value) => {
  translationSettingsStore.toggleDebugLogging(value);
};

const handleClearLocalStorage = () => {
  translationSettingsStore.dialogVisible = true;
};

const handleClearLocalStorageConfirm = () => {
  clearAllSettings();
};

onMounted(async () => {
  try {
    apiStore.initializeApiSettings();
    translationSettingsStore.initializeTranslationSettings();
    localApiKey.value = apiStore.apiKey || "";
    debugLog("API Store State:", {
      apiKey: apiStore.apiKey,
      loadingStates: apiStore.loadingStates,
    });
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

.debug-logging-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;

  .el-input-number {
    width: 160px;
    color: #606266;
  }
}
</style>
