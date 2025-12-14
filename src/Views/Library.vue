<template>
  <div class="library_group">
    <h2 class="title">{{ t("library.title") }}</h2>

    <div class="filter-section">
      <LibraryFilter v-model:filter-key-name="filterKeyName" v-model:filter-project="filterProject"
        v-model:filter-condition="filterCondition" :filter-conditions="filterConditions" :project-list="projectList"
        @clear="handleClear" @search="handleSearch" />
    </div>

    <div class="table-section">
      <el-table :data="tableData" style="width: 100%" v-loading="loading" :element-loading-text="t('common.loading')"
        stripe border>
        <el-table-column prop="keyName" :label="t('library.keyName')" width="200" />
        <el-table-column prop="project" :label="t('library.project')" width="150" />
        <el-table-column prop="english" :label="t('library.english')" min-width="200" />
        <el-table-column prop="chinese" :label="t('library.chinese')" min-width="200" />
        <el-table-column prop="spanish" :label="t('library.spanish')" min-width="200" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "../composables/Core/useI18n.js";
import LibraryFilter from "../Components/Library/LibraryFilter.vue";
import { useLibraryStore } from "../stores/library.js";

const { t } = useI18n();
const libraryStore = useLibraryStore();

// 使用 storeToRefs 保持响应式
const { filterKeyName, filterProject, filterCondition, filterConditions, projectList, tableData, loading } =
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

:deep(.el-table) {
  border: 1px solid #ebeef5;

  th {
    background-color: #f5f7fa;
    font-weight: 600;
    color: #303133;
  }

  td {
    padding: 12px 0;
  }
}
</style>
