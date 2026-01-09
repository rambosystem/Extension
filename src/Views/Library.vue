<template>
  <div class="library_group">
    <h2 class="title">{{ t("library.title") }}</h2>

    <div class="filter-section">
      <LibraryFilter v-model:filter-key-name="filterKeyName" v-model:filter-project="filterProject"
        v-model:filter-condition="filterCondition" :filter-conditions="filterConditions" :project-list="projectList"
        @clear="handleClear" @search="handleSearch" />
    </div>

    <div class="table-section">
      <LibraryTableConfig :initial-row-height="rowHeight" :initial-visible-columns="visibleColumns"
        :selected-rows="selectedRows" :selection-scope="selectionScope" @lineHeight="handleLineHeight"
        @columnConfig="handleColumnConfig" @bulkOperation="handleBulkOperation"
        @selection-scope-change="handleSelectionScopeChange" />
      <LibraryTable ref="tableRef" :data="tableData" :loading="loading" :loading-text="t('common.loading')"
        :row-height="rowHeight" :visible-columns="visibleColumns" :selection-scope="selectionScope"
        @operation="handleOperation" @selection-change="handleSelectionChange" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../composables/Core/useI18n.js";
import LibraryFilter from "../Components/Library/LibraryFilter.vue";
import LibraryTable from "../Components/Library/LibraryTable.vue";
import LibraryTableConfig from "../Components/Library/LibraryTableConfig.vue";
import { useLibraryStore } from "../stores/library.js";

const { t } = useI18n();
const libraryStore = useLibraryStore();
const tableRef = ref(null);

// 使用 storeToRefs 保持响应式
const { filterKeyName, filterProject, filterCondition, filterConditions, projectList, tableData, loading, rowHeight, visibleColumns, selectedRows, selectionScope } =
  storeToRefs(libraryStore);




/**
 * 清除筛选条件
 */
const handleClear = () => {
  libraryStore.clearFilters();
};

/**
 * 执行搜索
 */
const handleSearch = async () => {
  await libraryStore.search();
};

/**
 * 处理操作按钮点击
 */
const handleOperation = (row) => {
  // 操作功能待实现
  console.log("Operation clicked for row:", row);
};

/**
 * 处理行高配置选择
 */
const handleLineHeight = (value) => {
  libraryStore.setRowHeight(value);
};

/**
 * 处理自定义列配置更改
 */
const handleColumnConfig = (columns) => {
  libraryStore.setVisibleColumns(columns);
};

/**
 * 处理表格选中变化
 */
const handleSelectionChange = (selection) => {
  libraryStore.setSelectedRows(selection);
  // console.log("Selected rows:", selection);
};

/**
 * 处理选择范围变化
 */
const handleSelectionScopeChange = (scope) => {
  libraryStore.setSelectionScope(scope);
  // 根据选择范围执行全选
  if (tableRef.value) {
    tableRef.value.handleSelectAll(scope);
  }
};

onMounted(() => {
  libraryStore.loadProjectList();
  libraryStore.loadTableData();
});
</script>

<style lang="scss" scoped>
.library_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #303133;
}

.filter-section {
  padding-top: 10px;
  position: relative;
}

.table-section {
  margin-top: 24px;
}
</style>
