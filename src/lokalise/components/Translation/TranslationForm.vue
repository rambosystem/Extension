<template>
  <el-form label-position="top" class="translation-form">
    <el-form-item :label="t('translation.enCopywriting')" prop="content">
      <div class="CodeEditor">
        <CodeEditor
          :modelValue="translationCoreStore.codeContent"
          @update:modelValue="translationCoreStore.setCodeContent"
        >
        </CodeEditor>
      </div>
    </el-form-item>
    <el-form-item>
      <div class="button-container">
        <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
        <el-button
          type="text"
          @click="translationCoreStore.showLastTranslation"
          v-if="translationCoreStore.hasLastTranslation"
        >
          {{ t("translation.lastTranslation") }}
        </el-button>
        <!-- Clear按钮，固定显�?-->
        <el-button
          style="min-width: 90px"
          @click="translationCoreStore.handleClear"
        >
          {{ t("common.clear") }}
        </el-button>
        <el-button
          v-if="shouldShowDeduplicateButton"
          style="min-width: 90px"
          @click="handleDeduplicate"
          :loading="deduplicateStore.isDeduplicating"
          :disabled="deduplicateStore.isDeduplicating"
        >
          {{
            deduplicateStore.isDeduplicating
              ? t("translation.processing")
              : t("translation.deduplicate")
          }}
        </el-button>
        <el-button
          type="primary"
          @click="handleTranslate"
          style="min-width: 90px"
        >
          {{ t("translation.translate") }}
        </el-button>
      </div>
    </el-form-item>
  </el-form>
</template>

<script setup>
import CodeEditor from "@/Components/Common/CodeEditor.vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import { useTranslationCoreStore } from "@/stores/translation/core.js";
import { useTranslationSettingsStore } from "@/stores/settings/translation.js";
import { useDeduplicateStore } from "@/stores/translation/deduplicate.js";
import { useApiStore } from "@/stores/settings/api.js";
import { useExportStore } from "@/stores/translation/export.js";
import { debugLog } from "@/utils/debug.js";
import { computed, onMounted } from "vue";

const { t } = useI18n();

// 使用 Stores
const translationCoreStore = useTranslationCoreStore();
const translationSettingsStore = useTranslationSettingsStore();
const deduplicateStore = useDeduplicateStore();
const apiStore = useApiStore();
const exportStore = useExportStore();

// 不再需�?props，直接使�?stores

const emit = defineEmits(["deduplicate"]);

// 计算属性：判断是否应该显示去重按钮
// 需要同时满足：1. Auto 去重已关�?2. �?Lokalise Token 3. �?Default Project
const shouldShowDeduplicateButton = computed(() => {
  return (
    !translationSettingsStore.autoDeduplication &&
    apiStore.hasLokaliseToken &&
    !!exportStore.defaultProjectId
  );
});

const handleDeduplicate = () => {
  emit("deduplicate");
};

// 处理翻译按钮点击
const handleTranslate = async () => {
  const result = await translationCoreStore.handleTranslate();

  // 如果需要去重，直接执行去重（不需要对话框�?
  if (result && result.needsDeduplication) {
    window.dispatchEvent(
      new CustomEvent("showAutoDeduplicateDialog", {
        detail: {
          codeContent: translationCoreStore.codeContent,
          continueTranslation: translationCoreStore.continueTranslation,
          clearCache: translationCoreStore.handleClear,
        },
      })
    );
  }
};

// 组件挂载时初始化设置，避免状态延迟导致的按钮闪烁
onMounted(() => {
  debugLog("[TranslationForm] Component mounted, initializing settings...");

  // 立即初始化翻译设置（包括 autoDeduplication 状态）
  translationSettingsStore.initializeTranslationSettings();
  debugLog(
    "[TranslationForm] Translation Settings initialized. autoDeduplication:",
    translationSettingsStore.autoDeduplication
  );

  // 初始�?API store（包�?Lokalise Token�?
  apiStore.initializeApiSettings();
  debugLog(
    "[TranslationForm] API Store initialized. hasLokaliseToken:",
    apiStore.hasLokaliseToken
  );

  // 初始�?Export store（包�?Default Project�?
  exportStore.initializeTranslationSettings();
  debugLog(
    "[TranslationForm] Export Store initialized. defaultProjectId:",
    exportStore.defaultProjectId
  );

  debugLog("[TranslationForm] translationCoreStore:", translationCoreStore);
  debugLog(
    "[TranslationForm] translationSettingsStore:",
    translationSettingsStore
  );
  debugLog(
    "[TranslationForm] shouldShowDeduplicateButton:",
    shouldShowDeduplicateButton.value
  );
});
</script>

<style lang="scss" scoped>
.translation-form {
  width: 100%;
}

.CodeEditor {
  width: 100%;
}

.button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

/* Last Translation 按钮样式 */
.button-container .el-button--text {
  color: #409eff;
  font-size: 14px;
  padding: 0;
  height: auto;
  line-height: 1.5;
}

.button-container .el-button--text:hover {
  color: #66b1ff;
  text-decoration: underline;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>

