<template>
  <div class="library-table-wrapper" :style="{ '--table-row-height': `${props.rowHeight}px` }">
    <el-table :data="data" style="width: 100%" v-loading="loading" :element-loading-text="loadingText">
      <el-table-column prop="keyName" :label="labelKeyName" width="200" fixed="left" />
      <el-table-column prop="project" :label="labelProject" width="150" />
      <el-table-column prop="english" :label="labelEnglish" min-width="300" />
      <el-table-column prop="chinese" :label="labelChinese" min-width="300" />
      <el-table-column prop="spanish" :label="labelSpanish" min-width="300" />
      <el-table-column fixed="right" width="50" align="center">
        <template #default="{ row }">
          <div class="operation-container">
            <img src="@/assets/operation.svg" alt="操作" class="operation-icon" @click="handleOperation(row)" />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
/**
 * LibraryTable - Library 页面的表格组件
 * 
 * 封装了 Library 页面专用的表格展示，包含固定的列配置：
 * - Key Name（键名）
 * - Project（项目）
 * - English（英文）
 * - Chinese（中文）
 * - Spanish（西班牙文）
 * 
 * @component
 * @example
 * <LibraryTable :data="tableData" :loading="loading" />
 */
import { computed } from "vue";
import { useI18n } from "../../composables/Core/useI18n.js";

const props = defineProps({
  /**
   * 表格数据
   * @type {Array<Object>}
   * @default []
   */
  data: {
    type: Array,
    default: () => [],
  },
  /**
   * 加载状态
   * @type {Boolean}
   * @default false
   */
  loading: {
    type: Boolean,
    default: false,
  },
  /**
   * 加载提示文本
   * @type {String}
   * @default ""
   */
  loadingText: {
    type: String,
    default: "",
  },
  /**
   * 表格行高（像素）
   * @type {Number}
   * @default 50
   */
  rowHeight: {
    type: Number,
    default: 50,
  },
});

const { t } = useI18n();

const emit = defineEmits(["operation"]);

// 列标签的翻译
const labelKeyName = computed(() => t("library.keyName"));
const labelProject = computed(() => t("library.project"));
const labelEnglish = computed(() => t("library.english"));
const labelChinese = computed(() => t("library.chinese"));
const labelSpanish = computed(() => t("library.spanish"));

// 操作按钮点击事件
const handleOperation = (row) => {
  // 触发操作事件，由父组件处理
  emit("operation", row);
};
</script>

<style lang="scss" scoped>
.library-table-wrapper {
  border-top: 1px solid #f0f0f0;
  --table-row-height: 50px;
}

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
  height: var(--table-row-height);
}

:deep(.el-table th) {
  border: none;
  padding: 0;
  height: var(--table-row-height);
  color: #606266;
  font-weight: 600;
}

:deep(.el-table__row) {
  height: var(--table-row-height);
}

:deep(.el-table__row:last-child td) {
  border-bottom: none;
}

:deep(.el-table__cell) {
  border: none;
  padding: 0;
}

/* 禁止单元格内容换行 */
:deep(.el-table .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #66666c;
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

/* 操作列样式 */
.operation-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  height: 100%;
}

.operation-icon {
  width: 18px;
  height: 18px;
  cursor: pointer;
  transition: opacity 0.2s;
  display: block;
}

.operation-icon:hover {
  opacity: 0.7;
}
</style>
