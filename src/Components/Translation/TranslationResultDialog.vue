<template>
  <el-dialog
    :modelValue="translationCoreStore.dialogVisible"
    @update:modelValue="translationCoreStore.setDialogVisible"
    width="70%"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-title-wrapper">
          <span class="dialog-title">{{
            t("translation.translationResult")
          }}</span>
          <div
            v-if="translationCoreStore.loadingStates.translation"
            class="loading-indicator"
          >
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span class="loading-text">{{
              translationCoreStore.getStatusText()
            }}</span>
            <span
              v-if="translationCoreStore.translationProgress.total > 0"
              class="progress-counter"
            >
              {{ translationCoreStore.translationProgress.finished }} /
              {{ translationCoreStore.translationProgress.total }}
            </span>
          </div>
        </div>
      </div>
    </template>
    <el-form label-position="top">
      <el-form-item>
        <el-table
          :data="filteredTranslationResult"
          style="width: 100%"
          height="450"
          empty-text=""
        >
          <!-- 动态生成列 -->
          <el-table-column
            v-for="column in tableColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :min-width="column.minWidth"
          >
            <template #default="{ row, $index }">
              <EditableCell
                :value="row[column.prop]"
                :isEditing="row[`editing_${column.prop}`]"
                @enterEdit="
                  translationCoreStore.enterEditMode($index, column.prop)
                "
                @exitEdit="row[`editing_${column.prop}`] = false"
                @update:value="row[column.prop] = $event"
                @save="() => handleSaveTranslation($index)"
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
                  @hide="translationCoreStore.handlePopoverHide"
                >
                  <template #reference>
                    <el-icon>
                      <MoreFilled />
                    </el-icon>
                  </template>
                  <div
                    class="user-suggestion"
                    v-if="translationCoreStore.userSuggestionVisible"
                  >
                    <el-input
                      type="textarea"
                      :modelValue="translationCoreStore.userSuggestion"
                      @update:modelValue="
                        translationCoreStore.setUserSuggestion
                      "
                      :autosize="{ minRows: 2 }"
                      :placeholder="t('translation.userSuggestionPlaceholder')"
                    />
                    <el-row justify="end" style="margin-top: 10px">
                      <el-button
                        plain
                        size="small"
                        style="min-width: 64px"
                        @click="
                          translationCoreStore.handleUseSuggestionCancel()
                        "
                        >{{ t("common.cancel") }}</el-button
                      >
                      <el-button
                        type="primary"
                        size="small"
                        style="min-width: 64px"
                        @click="translationCoreStore.handleUseSuggestion()"
                        >{{ t("common.retry") }}</el-button
                      >
                    </el-row>
                  </div>
                  <div
                    class="operation-list"
                    v-if="!translationCoreStore.userSuggestionVisible"
                  >
                    <div
                      class="operation-list-item"
                      @click="translationCoreStore.handleDelete(row)"
                    >
                      Delete
                    </div>
                  </div>
                </el-popover>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item>
      <div class="dialog-button-container">
        <el-button @click="translationCoreStore.closeDialog()">{{
          t("common.cancel")
        }}</el-button>
        <el-button
          type="primary"
          @click="
            exportStore.exportExcel(translationCoreStore.translationResult)
          "
          :disabled="translationCoreStore.isTranslating"
          >{{ t("translation.exportExcel") }}</el-button
        >
        <el-button
          type="primary"
          @click="
            uploadStore.uploadToLokalise(translationCoreStore.translationResult)
          "
          :disabled="translationCoreStore.isTranslating"
          >{{ t("translation.uploadToLokalise") }}</el-button
        >
      </div>
    </el-form>
  </el-dialog>
</template>

<script setup>
import EditableCell from "../Common/EditableCell.vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useTranslationCoreStore } from "../../stores/translation/core.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { MoreFilled, Loading } from "@element-plus/icons-vue";
import { computed } from "vue";
import { getAvailableLanguages } from "../../config/languages.js";

const { t } = useI18n();

// 使用翻译Store
const translationCoreStore = useTranslationCoreStore();
const exportStore = useExportStore();
const uploadStore = useUploadStore();

// 格式化语言名称（首字母大写）
const formatLanguageLabel = (langCode) => {
  const lang = langCode.toLowerCase();
  if (lang === "chinese") return "Chinese";
  if (lang === "japanese") return "Japanese";
  if (lang === "spanish") return "Spanish";
  // 默认首字母大写
  return langCode.charAt(0).toUpperCase() + langCode.slice(1).toLowerCase();
};

// 计算表格列配置
const tableColumns = computed(() => {
  // 从 store 获取目标语言设置（响应式更新）
  const targetLanguages = exportStore.targetLanguages || [];

  // 构建列配置：第一列是英文，后面是目标语言
  const columns = [
    {
      prop: "en",
      label: "EN",
      minWidth: 200,
    },
  ];

  // 按照配置文件的固定顺序排序目标语言（Chinese, Japanese, Spanish）
  const availableLanguages = getAvailableLanguages();
  const sortedLanguages = availableLanguages
    .filter((availLang) => targetLanguages.includes(availLang.code))
    .map((availLang) => availLang.code);

  // 添加目标语言列（按固定顺序：Chinese, Japanese, Spanish）
  sortedLanguages.forEach((lang) => {
    const prop = lang.toLowerCase().replace(/\s+/g, "_");
    columns.push({
      prop: prop,
      label: formatLanguageLabel(lang),
      minWidth: 200,
    });
  });

  return columns;
});

// 过滤翻译结果，只保留当前选中的语言字段
const filteredTranslationResult = computed(() => {
  // 从 store 获取目标语言设置（响应式更新）
  const targetLanguages = exportStore.targetLanguages || [];

  // 构建允许的字段列表
  const allowedFields = new Set(["en"]);
  targetLanguages.forEach((lang) => {
    const prop = lang.toLowerCase().replace(/\s+/g, "_");
    allowedFields.add(prop);
  });

  // 过滤数据，只保留允许的字段
  return translationCoreStore.translationResult.map((item) => {
    const filteredItem = {};
    // 保留所有允许的字段（包括编辑状态字段）
    Object.keys(item).forEach((key) => {
      // 如果是编辑状态字段，检查对应的数据字段是否在允许列表中
      if (key.startsWith("editing_")) {
        const dataField = key.replace("editing_", "");
        if (allowedFields.has(dataField)) {
          filteredItem[key] = item[key];
        }
      } else if (allowedFields.has(key)) {
        // 如果是数据字段且在允许列表中，保留
        filteredItem[key] = item[key];
      }
    });
    return filteredItem;
  });
});

// 处理保存翻译结果
const handleSaveTranslation = (index) => {
  // 从 store 获取目标语言设置（响应式更新）
  const targetLanguages = exportStore.targetLanguages || [];

  // 构建列名数组
  const columns = [
    "en",
    ...targetLanguages.map((lang) => {
      return lang.toLowerCase().replace(/\s+/g, "_");
    }),
  ];

  // 更新本地存储中的翻译结果
  const translationData = translationCoreStore.translationResult.map((item) => {
    const data = {};
    columns.forEach((col) => {
      if (item.hasOwnProperty(col)) {
        data[col] = item[col];
      }
    });
    return data;
  });
  translationCoreStore.saveTranslationToLocal(translationData);
};
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

.dialog-button-container {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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

/* 设置对话框内边距 */
:deep(.el-dialog) {
  --el-dialog-padding-primary: 20px;
}

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

:deep(.el-dialog__body) {
  padding: 0px;
}

/* 对话框标题样式 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.dialog-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.dialog-title {
  font-weight: 600;
  font-size: 18px;
  color: #303133;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #409eff;
  font-size: 14px;
  margin-left: 0;
}

.loading-indicator .el-icon {
  font-size: 16px;
}

.loading-text {
  color: #409eff;
}

.progress-counter {
  color: #909399;
  font-size: 13px;
  margin-left: 4px;
}
</style>
