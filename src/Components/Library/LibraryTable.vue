<template>
  <div class="library-table-wrapper" :style="{ '--table-row-height': `${props.rowHeight}px` }">
    <el-table ref="tableRef" :data="paginatedData" style="width: 100%" v-loading="loading"
      :element-loading-text="loadingText" @selection-change="handleSelectionChange" :row-key="getRowKey"
      max-height="600">
      <el-table-column type="selection" width="55" fixed="left" />
      <el-table-column prop="keyName" :label="labelKeyName" width="200" fixed="left" />
      <el-table-column v-if="visibleColumns.includes('project')" prop="project" :label="labelProject" width="150" />
      <el-table-column v-if="visibleColumns.includes('english')" prop="english" :label="labelEnglish" min-width="300" />
      <el-table-column v-if="visibleColumns.includes('chinese')" prop="chinese" :label="labelChinese" min-width="300" />
      <el-table-column v-if="visibleColumns.includes('japanese')" prop="japanese" :label="labelJapanese"
        min-width="300" />
      <el-table-column v-if="visibleColumns.includes('spanish')" prop="spanish" :label="labelSpanish" min-width="300" />
      <el-table-column fixed="right" width="50" align="center">
        <template #default="{ row }">
          <div class="operation-container">
            <img src="@/assets/operation.svg" alt="操作" class="operation-icon" @click="handleOperation(row)" />
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-section">
      <div class="pagination-container">
        <div class="pagination-total-container">
          <el-pagination v-model:current-page="currentPage" :total="totalItems" layout="total"></el-pagination>
          <span class="pagination-total-text">{{ t("library.items") }}</span>
        </div>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[5, 10, 20, 50]"
          :total="totalItems" layout="sizes, prev, pager, next, jumper" @current-change="handleCurrentChange"
          @size-change="handleSizeChange" background :pager-count="7" :hide-on-single-page="false" />
      </div>
    </div>
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
import { computed, ref, watch } from "vue";
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
  /**
   * 可见的列（列名数组）
   * @type {Array<String>}
   * @default ["english", "chinese", "japanese"]
   */
  visibleColumns: {
    type: Array,
    default: () => ["english", "chinese", "japanese"],
  },
});

const { t } = useI18n();

const emit = defineEmits(["operation", "selection-change"]);

const tableRef = ref(null);

/**
 * 获取行的唯一标识
 */
const getRowKey = (row) => {
  // 使用 keyName 作为唯一标识
  return row.keyName || row.id || Math.random();
};

// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);

// 计算分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return props.data.slice(start, end);
});

// 监听数据变化，更新总数
watch(
  () => props.data,
  (newData) => {
    totalItems.value = newData.length;
    // 如果当前页超出范围，重置到第一页
    const maxPage = Math.ceil(totalItems.value / pageSize.value);
    if (currentPage.value > maxPage && maxPage > 0) {
      currentPage.value = 1;
    }
  },
  { immediate: true }
);

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page;
};

// 处理每页条数变化
const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1; // 重置到第一页
};

// 列标签的翻译
const labelKeyName = computed(() => t("library.keyName"));
const labelProject = computed(() => t("library.project"));
const labelEnglish = computed(() => t("library.english"));
const labelChinese = computed(() => t("library.chinese"));
const labelJapanese = computed(() => t("library.japanese"));
const labelSpanish = computed(() => t("library.spanish"));

// 操作按钮点击事件
const handleOperation = (row) => {
  // 触发操作事件，由父组件处理
  emit("operation", row);
};

/**
 * 处理选中变化
 */
const handleSelectionChange = (selection) => {
  emit("selection-change", selection);
};
</script>

<style lang="scss" scoped>
.library-table-wrapper {
  border-top: 1px solid #f0f0f0;
  --table-row-height: 50px;
  display: flex;
  flex-direction: column;
  height: 500px;
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

/* 分页样式 */
.pagination-section {
  margin-top: 0;
  padding-top: 20px;
  padding-bottom: 0;
}

.pagination-container {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-total-container {
  padding-left: 22px;
  display: flex;
  align-items: center;
}

.pagination-total-text {
  font-size: 14px;
  color: #606266;
  padding-left: 4px;
}
</style>
