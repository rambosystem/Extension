<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>
    <el-form :model="formData" ref="formRef" label-position="top" class="translation-form">
      <el-form-item :label="t('translation.enCopywriting')" prop="content">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item>
        <div class="button-container">
          <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
          <el-button type="text" @click="showLastTranslation" v-if="hasLastTranslation">
            {{ t('translation.lastTranslation') }}
          </el-button>
          <!-- Clear按钮，固定显示 -->
          <el-button style="width: 90px" @click="handleClear">
            {{ t('common.clear') }}
          </el-button>
          <el-button type="primary" @click="handleTranslate">
            {{ t('translation.translate') }}
          </el-button>
        </div>
      </el-form-item>
      <h2 class="title">{{ t('translation.exportSetting') }}</h2>
      <el-form-item :label="t('translation.excelKeySetting')" label-position="left">
        <el-input v-model="excelBaselineKey" :placeholder="t('translation.excelKeySettingPlaceholder')"
          @blur="handleExcelBaselineKeyCancel" @focus="handleExcelBaselineKeyFocus" />
      </el-form-item>
      <el-form-item v-show="excelBaselineKeyEditing">
        <div class="button-container">
          <el-button @click="handleExcelBaselineKeyClear" style="width: 90px">{{ t('common.clear') }}</el-button>
          <el-button type="primary" @click="handleExcelBaselineKeySave" style="width: 90px">{{ t('common.save')
          }}</el-button>
        </div>
      </el-form-item>
    </el-form>
    <!-- 使用El-dialog展示翻译结果, 结果使用El-table展示-->
    <!-- 提供导出Excel功能-->
    <el-dialog v-model="dialogVisible" :title="t('translation.translationResult')" width="70%">
      <el-form label-position="top">
        <el-form-item>
          <el-table :data="translationResult" style="width: 100%" height="450" empty-text=''
            v-loading="loadingStates.translation" :element-loading-text="getStatusText()">
            <el-table-column prop="en" label="EN">
              <template #default="{ row, $index }">
                <EditableCell :value="row.en" :isEditing="row.editing_en" @enterEdit="enterEditMode($index, 'en')"
                  @exitEdit="row.editing_en = false" @update:value="row.en = $event" />
              </template>
            </el-table-column>
            <el-table-column prop="cn" label="CN">
              <template #default="{ row, $index }">
                <EditableCell :value="row.cn" :isEditing="row.editing_cn" @enterEdit="enterEditMode($index, 'cn')"
                  @exitEdit="row.editing_cn = false" @update:value="row.cn = $event" />
              </template>
            </el-table-column>
            <el-table-column prop="jp" label="JP">
              <template #default="{ row, $index }">
                <EditableCell :value="row.jp" :isEditing="row.editing_jp" @enterEdit="enterEditMode($index, 'jp')"
                  @exitEdit="row.editing_jp = false" @update:value="row.jp = $event" />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item>
          <div class="dialog-button-container">
            <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="exportExcelAndUpload">{{ t('translation.exportExcelAndUpload')
            }}</el-button>
            <el-button type="primary" @click="exportExcel">{{ t('translation.exportExcel') }}</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup>
import CodeEditor from "./CodeEditor.vue";
import EditableCell from "./EditableCell.vue";
import { useTranslationManager } from "../composables/useTranslationManager.js";
import { useI18n } from "../composables/useI18n.js";
import { useSettings } from "../composables/useSettings.js";
import { ref, watch, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";

const { t } = useI18n();

// 使用设置管理
const { excelBaselineKey, handleSaveExcelBaselineKey } = useSettings();

const excelBaselineKeyEditing = ref(false);
const isSaving = ref(false);

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

const handleExcelBaselineKeySave = () => {
  if (!excelBaselineKeyEditing.value) return;

  const currentValue = excelBaselineKey.value || "";

  // 检查是否为空
  if (!currentValue.trim()) {
    ElMessage.warning(t('translation.excelBaselineKeySaveWarning'));
    return;
  }

  isSaving.value = true;

  const success = handleSaveExcelBaselineKey(currentValue);
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
  handleSaveExcelBaselineKey("");
};

// 监听baseline key清空事件
const handleBaselineKeyCleared = () => {
  excelBaselineKey.value = "";
  excelBaselineKeyEditing.value = false;
};

// 组件挂载时添加事件监听
onMounted(() => {
  window.addEventListener('baselineKeyCleared', handleBaselineKeyCleared);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('baselineKeyCleared', handleBaselineKeyCleared);
});

/**
 * 清除编辑器内容
 */
const handleClear = () => {
  codeContent.value = "";
  // 清空缓存
  clearCache();
};

// 使用翻译管理composable
const {
  codeContent,
  dialogVisible,
  formRef,
  formData,
  translationResult,
  loadingStates,
  currentStatus,
  getStatusText,
  handleTranslate,
  showLastTranslation,
  exportExcel,
  exportExcelAndUpload,
  enterEditMode,
  hasLastTranslation,
  clearCache,
} = useTranslationManager();

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.translation_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.translation-form {
  width: 100%;
}

.translation-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
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

.dialog-button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}

/* 对话框表单样式 */
:deep(.el-dialog .el-form) {
  margin: 0;
}

:deep(.el-dialog .el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-dialog .el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.el-dialog .el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

/* 加粗对话框标题 */
:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

/* 设置对话框内边距 */
:deep(.el-dialog) {
  --el-dialog-padding-primary: 20px;
}

/* 单元格样式已经移到 EditableCell 组件中 */

/* 表格样式优化 */
:deep(.el-table) {
  border: none;
}

:deep(.el-table__border-top-patch) {
  display: none;
}

:deep(.el-table__border-right-patch) {
  display: none;
}

:deep(.el-table td) {
  border: none;
  border-bottom: 1px solid #f0f0f0;
  padding: 0;
  height: 50px;
}

:deep(.el-table th) {
  border: none;
  height: 50px;
  padding-left: 12px;
}

:deep(.el-table__row) {
  height: 50px;
}

:deep(.el-table__row:last-child td) {
  border-bottom: none;
}

:deep(.el-table__cell) {
  border: none;
  padding: 0;
}

:deep(.el-table--border) {
  border: none;
}

:deep(.el-table--border::after) {
  display: none;
}

:deep(.el-table--border::before) {
  display: none;
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
}
</style>
