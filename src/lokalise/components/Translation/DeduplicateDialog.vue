<template>
  <el-dialog
    :modelValue="deduplicateDialogVisible"
    @update:modelValue="handleDialogVisibleChange"
    :title="t('translation.selectProject')"
    width="400px"
    top="30vh"
    :close-on-click-modal="!isDeduplicating"
    :close-on-press-escape="!isDeduplicating"
    v-loading="isDeduplicating"
    :element-loading-text="t('upload.processingDeduplication')"
    element-loading-spinner="el-icon-loading"
  >
    <el-form label-position="top">
      <el-form-item :label="t('translation.selectProject')">
        <el-input
          :modelValue="selectedProject || ''"
          :placeholder="t('translationResult.noProjectSelected')"
          style="width: 100%"
          readonly
          :disabled="isDeduplicating"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button
          @click="closeDeduplicateDialog"
          :disabled="isDeduplicating"
          style="min-width: 90px"
        >
          {{ t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          style="min-width: 90px"
          @click="executeDeduplicate"
          :disabled="!selectedProject || isDeduplicating"
          :loading="isDeduplicating"
        >
          {{
            isDeduplicating
              ? t("translation.processing")
              : t("translation.startDeduplicate")
          }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import { useDeduplicateStore } from "@/lokalise/stores/translation/deduplicate.js";
import { useExportStore } from "@/lokalise/stores/translation/export.js";
import { useApiStore } from "@/lokalise/stores/settings/api.js";
import { debugLog } from "@/utils/debug.js";

const { t } = useI18n();
const deduplicateStore = useDeduplicateStore();
const exportStore = useExportStore();
const apiStore = useApiStore();

// 使用 store 中的状思，丝冝需�?props
const deduplicateDialogVisible = computed(
  () => deduplicateStore.deduplicateDialogVisible
);
const selectedProject = computed(() => deduplicateStore.selectedProject);
const isDeduplicating = computed(() => deduplicateStore.isDeduplicating);

// 定义 emits，坪保留必覝的事�?
const emit = defineEmits(["close", "execute"]);

// 处睆对话框坯觝性坘�?
const handleDialogVisibleChange = (visible) => {
  if (!visible) {
    deduplicateStore.setDeduplicateDialogVisible(false);
  }
};

/**
 * 初始化默认项目选择（直接使�?Default Project�?
 */
const initializeDefaultProject = () => {
  try {
    debugLog("[DeduplicateDialog] Initializing default project...");
    const defaultProjectId = exportStore.defaultProjectId;
    if (defaultProjectId) {
      const projectName = deduplicateStore.getProjectNameById(defaultProjectId);
      if (projectName) {
        deduplicateStore.setSelectedProject(projectName);
        debugLog(
          "[DeduplicateDialog] Default project initialized:",
          projectName
        );
      } else {
        debugLog(
          "[DeduplicateDialog] Default project ID found but name not found:",
          defaultProjectId
        );
      }
    } else {
      debugLog("[DeduplicateDialog] No default project ID set");
    }
  } catch (error) {
    debugLog(
      "[DeduplicateDialog] Failed to initialize default project:",
      error
    );
  }
};

// 组件挂载时初始化
onMounted(() => {
  // 确保 API store 已初始化
  apiStore.initializeApiSettings();
  // 确保 Export store 已初始化
  exportStore.initializeTranslationSettings();
  // 初始化默认项目选择
  initializeDefaultProject();
});

// 监坬对话框打开，初始化默认项目
watch(
  () => deduplicateDialogVisible.value,
  (visible) => {
    if (visible) {
      // 初始化去針设置（会使�?Default Project�?
      deduplicateStore.initializeDeduplicateSettings();
      // 初始化默认项目选择
      initializeDefaultProject();
    }
  }
);

// 关闭对话�?
const closeDeduplicateDialog = () => {
  deduplicateStore.closeDeduplicateDialog();
  emit("close");
};

// 执行去針
const executeDeduplicate = () => {
  emit("execute");
};
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-dialog__body) {
  padding: 0px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}
</style>

