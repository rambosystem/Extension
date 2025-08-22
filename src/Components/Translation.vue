<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>
    <el-form
      :model="formData"
      ref="formRef"
      label-position="top"
      class="translation-form"
    >
      <el-form-item :label="t('translation.enCopywriting')" prop="content">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item>
        <div class="button-container">
          <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
          <el-button
            type="text"
            @click="showLastTranslation"
            v-if="hasLastTranslation"
          >
            {{ t("translation.lastTranslation") }}
          </el-button>
          <!-- Clear按钮，固定显示 -->
          <el-button style="min-width: 90px" @click="handleClear">
            {{ t("common.clear") }}
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
      <h2 class="title">{{ t("translation.exportSetting") }}</h2>
      <el-form-item
        :label="t('translation.excelKeySetting')"
        label-position="left"
      >
        <div class="excel-key-setting">
          <div class="input-container">
            <el-input
              v-model="excelBaselineKey"
              :placeholder="t('translation.excelKeySettingPlaceholder')"
              @blur="handleExcelBaselineKeyCancel"
              @focus="handleExcelBaselineKeyFocus"
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
    </el-form>
    <!-- 使用El-dialog展示翻译结果, 结果使用El-table展示-->
    <!-- 提供导出Excel功能-->
    <el-dialog
      v-model="dialogVisible"
      :title="t('translation.translationResult')"
      width="70%"
    >
      <el-form label-position="top">
        <el-form-item>
          <el-table
            :data="translationResult"
            style="width: 100%"
            height="450"
            empty-text=""
            v-loading="loadingStates.translation"
            :element-loading-text="getStatusText()"
          >
            <el-table-column prop="en" label="EN">
              <template #default="{ row, $index }">
                <EditableCell
                  :value="row.en"
                  :isEditing="row.editing_en"
                  @enterEdit="enterEditMode($index, 'en')"
                  @exitEdit="row.editing_en = false"
                  @update:value="row.en = $event"
                />
              </template>
            </el-table-column>
            <el-table-column prop="cn" label="CN">
              <template #default="{ row, $index }">
                <EditableCell
                  :value="row.cn"
                  :isEditing="row.editing_cn"
                  @enterEdit="enterEditMode($index, 'cn')"
                  @exitEdit="row.editing_cn = false"
                  @update:value="row.cn = $event"
                />
              </template>
            </el-table-column>
            <el-table-column prop="jp" label="JP">
              <template #default="{ row, $index }">
                <EditableCell
                  :value="row.jp"
                  :isEditing="row.editing_jp"
                  @enterEdit="enterEditMode($index, 'jp')"
                  @exitEdit="row.editing_jp = false"
                  @update:value="row.jp = $event"
                />
              </template>
            </el-table-column>
            <el-table-column
              fixed="right"
              :label="t('common.operation')"
              width="120"
            >
              <template #default="{ row }">
                <div class="operation-container">
                  <el-popover
                    trigger="hover"
                    placement="right-start"
                    :show-arrow="false"
                    :offset="5"
                    width="auto"
                    popper-style="padding: 8px 0;  min-width: 250px;"
                    @hide="handlePopoverHide"
                  >
                    <template #reference>
                      <el-icon>
                        <MoreFilled />
                      </el-icon>
                    </template>
                    <div class="user-suggestion" v-if="userSuggestionVisible">
                      <el-input
                        type="textarea"
                        v-model="userSuggestion"
                        :autosize="{ minRows: 2 }"
                        :placeholder="
                          t('translation.userSuggestionPlaceholder')
                        "
                      />
                      <el-row justify="end" style="margin-top: 10px">
                        <el-button
                          plain
                          size="small"
                          style="min-width: 64px"
                          @click="handleUseSuggestionCancel()"
                          >{{ t("common.cancel") }}</el-button
                        >
                        <el-button
                          type="primary"
                          size="small"
                          style="min-width: 64px"
                          @click="handleUseSuggestion()"
                          >{{ t("common.retry") }}</el-button
                        >
                      </el-row>
                    </div>
                    <div class="operation-list" v-if="!userSuggestionVisible">
                      <div
                        class="operation-list-item"
                        @click="handleDelete(row)"
                      >
                        Delete
                      </div>
                      <div
                        class="operation-list-item"
                        @click="handleRetranslation(row)"
                      >
                        Re-translation
                      </div>
                      <div
                        class="operation-list-item"
                        @click="handleRetranslationAndModify(row)"
                      >
                        Re-translation and how to modify
                      </div>
                    </div>
                  </el-popover>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item>
          <div class="dialog-button-container">
            <el-button @click="dialogVisible = false">{{
              t("common.cancel")
            }}</el-button>
            <el-button type="primary" @click="uploadToLokalise">{{
              t("translation.uploadToLokalise")
            }}</el-button>
            <el-button type="primary" @click="exportExcel">{{
              t("translation.exportExcel")
            }}</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 上传设置弹窗 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="Upload Setting"
      width="500px"
    >
      <el-form
        :model="uploadForm"
        label-position="top"
        @submit.prevent="executeUpload(translationResult)"
      >
        <el-form-item label="Project" required>
          <el-select
            v-model="uploadForm.projectId"
            placeholder="Select a project"
            style="width: 100%"
            @change="handleProjectChange"
          >
            <el-option
              v-for="project in projectList"
              :key="project.project_id"
              :label="project.name"
              :value="project.project_id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Tag">
          <el-input
            v-model="uploadForm.tag"
            placeholder="Enter tag (optional)"
            @input="handleTagChange"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeUploadDialog">Cancel</el-button>
          <el-button
            type="primary"
            @click="executeUpload(translationResult)"
            :disabled="!uploadForm.projectId"
          >
            Upload
          </el-button>
        </div>
      </template>
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
import { ElMessage, ElMessageBox } from "element-plus";
import { MoreFilled } from "@element-plus/icons-vue";
const { t } = useI18n();

const handleRetranslationAndModify = () => {
  userSuggestionVisible.value = true;
};

const handleUseSuggestionCancel = () => {
  userSuggestion.value = "";
  userSuggestionVisible.value = false;
};

const handlePopoverHide = () => {
  userSuggestion.value = "";
  userSuggestionVisible.value = false;
};

// 删除行
const handleDelete = (row) => {
  // 从表格数据中删除指定行
  const index = translationResult.value.findIndex((item) => item === row);
  if (index > -1) {
    translationResult.value.splice(index, 1);

    // 更新本地存储
    const translationData = translationResult.value.map((item) => ({
      en: item.en,
      cn: item.cn,
      jp: item.jp,
    }));
    saveTranslationToLocal(translationData);

    // 如果删除后没有数据了，关闭对话框
    if (translationResult.value.length === 0) {
      dialogVisible.value = false;
      ElMessage.info(t("translation.allDataDeleted"));
    } else {
      ElMessage.success(t("translation.deleteSuccess"));
    }
  }
};

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
    ElMessage.warning(t("translation.excelBaselineKeySaveWarning"));
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
  window.addEventListener("baselineKeyCleared", handleBaselineKeyCleared);
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener("baselineKeyCleared", handleBaselineKeyCleared);
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
  userSuggestion,
  userSuggestionVisible,
  getStatusText,
  handleTranslate,
  showLastTranslation,
  exportExcel,
  uploadToLokalise,
  enterEditMode,
  uploadDialogVisible,
  uploadForm,
  projectList,
  closeUploadDialog,
  executeUpload,
  handleProjectChange,
  handleTagChange,
  hasLastTranslation,
  clearCache,
  clearLastTranslation,
  saveTranslationToLocal,
} = useTranslationManager();

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.user-suggestion {
  padding: 8px 16px;
}

.operation-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  padding-right: 20px;
  cursor: pointer;

  .el-icon {
    transform: rotate(90deg);
  }
}

.operation-list {
  display: flex;
  flex-direction: column;

  .operation-list-item {
    padding: 8px 16px;
    cursor: pointer;

    &:hover {
      color: #409eff;
      background-color: #f5f7fa;
    }
  }
}

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
  gap: 8px;
}

/* 上传设置弹窗样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}
</style>
