<template>
  <div class="translation_group">
    <h2 class="title">{{ title }}</h2>
    <el-form :model="formData" ref="formRef" label-position="top" class="translation-form">
      <el-form-item label="EN Copywriting" prop="content">
        <div class="CodeEditor">
          <CodeEditor v-model="codeContent"></CodeEditor>
        </div>
      </el-form-item>
      <el-form-item>
        <div class="button-container">
          <!-- 提供一个文本链接，点击后展示上一次翻译的结果，如果值为空则隐藏按钮-->
          <el-button type="text" @click="showLastTranslation" v-if="hasLastTranslation()">
            Last Translation
          </el-button>
          <el-button type="primary" @click="handleTranslate" :loading="loading">
            Translate
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <!-- 使用El-dialog展示翻译结果, 结果使用El-table展示-->
    <!-- 提供导出CSV功能-->
    <el-dialog v-model="dialogVisible" title="Translation Result" width="70%">
      <el-form label-position="top">
        <el-form-item>
          <el-table :data="translationResult" style="width: 100%" height="450">
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
            <el-button @click="dialogVisible = false">Cancel</el-button>
            <el-button type="primary" @click="exportCSVAndUpload">Export CSV & Upload</el-button>
            <el-button type="primary" @click="exportCSV">Export CSV</el-button>
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

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

// 使用翻译管理composable
const {
  codeContent,
  dialogVisible,
  formRef,
  formData,
  translationResult,
  loading,
  handleTranslate,
  showLastTranslation,
  exportCSV,
  exportCSVAndUpload,
  enterEditMode,
  hasLastTranslation,
} = useTranslationManager();
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
  gap: 12px;
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
</style>
