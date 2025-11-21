<template>
  <div>
    <h2 class="title">{{ t("translationSetting.translationSetting") }}</h2>
    <el-form-item
      :label="t('translationSetting.exportKeySetting')"
      label-position="left"
    >
      <div class="excel-key-setting">
        <div class="input-container">
          <AutocompleteInput
            v-model="excelBaselineKey"
            :placeholder="t('translationSetting.exportKeySettingPlaceholder')"
            @blur="handleExcelBaselineKeyCancel"
            @focus="handleExcelBaselineKeyFocus"
            :get-project-id="getProjectId"
          />
        </div>
      </div>
    </el-form-item>
    <el-form-item v-show="excelBaselineKeyEditing">
      <div class="excel-key-setting-button-container">
        <el-button
          @click="handleExcelBaselineKeyClear"
          style="min-width: 90px"
          >{{ t("common.clear") }}</el-button
        >
        <el-button
          type="primary"
          @click="handleExcelBaselineKeySave"
          style="min-width: 90px"
          >{{ t("common.save") }}</el-button
        >
      </div>
    </el-form-item>
    <el-form-item
      :label="t('translationSetting.overwrite')"
      label-position="left"
    >
      <div class="excel-overwrite-setting">
        <el-switch
          v-model="Overwrite"
          @change="handleOverwriteChange"
          width="45px"
        />
      </div>
    </el-form-item>
  </div>
</template>

<script setup>
import { useI18n } from "../../composables/Core/useI18n.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { ref, watch, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import AutocompleteInput from "../Common/AutocompleteInput.vue";

const { t } = useI18n();

// 使用 Translation store
const exportStore = useExportStore();
const uploadStore = useUploadStore();

const excelBaselineKeyEditing = ref(false);
const isSaving = ref(false);

// 使用 computed 来获取 store 中的状态
const excelBaselineKey = computed({
  get: () => exportStore.excelBaselineKey,
  set: (value) => {
    exportStore.excelBaselineKey = value;
  },
});

// 使用 computed 来获取 Overwrite 状态
const Overwrite = computed({
  get: () => exportStore.excelOverwrite,
  set: (value) => {
    exportStore.excelOverwrite = value;
  },
});

//excelBaselineKey变动时，设置excelBaselineKeyEditing为true，空值时设置为false
watch(
  () => excelBaselineKey.value,
  (newValue) => {
    // 有值时显示按钮，空值时隐藏按钮
    if (newValue && newValue.trim()) {
      excelBaselineKeyEditing.value = true;
    } else {
      excelBaselineKeyEditing.value = false;
    }
  }
);

/**
 * 获取项目ID的函数
 */
const getProjectId = () => {
  return (
    uploadStore.uploadForm.projectId ||
    localStorage.getItem("lokalise_upload_project_id") ||
    "2582110965ade9652de217.13653519"
  );
};

const handleExcelBaselineKeySave = () => {
  if (!excelBaselineKeyEditing.value) return;

  const currentValue = excelBaselineKey.value || "";

  // 检查是否为空
  if (!currentValue.trim()) {
    ElMessage.warning(t("translationSetting.exportBaselineKeySaveWarning"));
    return;
  }

  isSaving.value = true;

  const success = exportStore.saveExcelBaselineKey(currentValue);
  if (success) {
    excelBaselineKeyEditing.value = false;
  }

  isSaving.value = false;
};

const handleExcelBaselineKeyFocus = () => {
  excelBaselineKeyEditing.value = true;
};

const handleExcelBaselineKeyCancel = () => {
  // 如果正在保存，不处理失焦
  if (isSaving.value) return;

  // 延迟处理，给用户时间点击保存按钮
  setTimeout(() => {
    if (excelBaselineKeyEditing.value && !isSaving.value) {
      // 失焦时清空值并隐藏按钮
      excelBaselineKey.value = "";
      excelBaselineKeyEditing.value = false;
    }
  }, 200);
};

const handleExcelBaselineKeyClear = () => {
  excelBaselineKey.value = "";
  excelBaselineKeyEditing.value = false;
  // 清空存储
  exportStore.saveExcelBaselineKey("");
};

const handleOverwriteChange = (value) => {
  // 使用 translation store 的方法更新状态
  exportStore.updateExcelOverwrite(value);
};

// 组件挂载时初始化 store
onMounted(() => {
  exportStore.initializeTranslationSettings();
  // 确保上传store已初始化，以便获取projectId
  uploadStore.initializeUploadSettings();
});
</script>

<style lang="scss" scoped>
.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.excel-key-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;

  .input-container {
    width: 200px;
  }
}

.excel-key-setting-button-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.excel-overwrite-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
