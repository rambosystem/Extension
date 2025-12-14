<template>
  <div class="library-table-wrapper" :style="{ '--table-row-height': `${props.rowHeight}px` }">
    <el-table ref="tableRef" :data="paginatedData" style="width: 100%" v-loading="loading"
      :element-loading-text="loadingText" @selection-change="handleSelectionChange" :row-key="getRowKey"
      max-height="600">
      <el-table-column type="selection" width="55" fixed="left" />
      <el-table-column prop="keyName" :label="labelKeyName" width="200" fixed="left"
        :show-overflow-tooltip="tooltipOptions" />
      <el-table-column v-if="visibleColumns.includes('project')" prop="project" :label="labelProject" width="150"
        :show-overflow-tooltip="tooltipOptions" />
      <el-table-column v-if="visibleColumns.includes('english')" prop="english" :label="labelEnglish" min-width="300"
        :show-overflow-tooltip="tooltipOptions" />
      <el-table-column v-if="visibleColumns.includes('chinese')" prop="chinese" :label="labelChinese" min-width="300"
        :show-overflow-tooltip="tooltipOptions" />
      <el-table-column v-if="visibleColumns.includes('japanese')" prop="japanese" :label="labelJapanese" min-width="300"
        :show-overflow-tooltip="tooltipOptions" />
      <el-table-column v-if="visibleColumns.includes('spanish')" prop="spanish" :label="labelSpanish" min-width="300"
        :show-overflow-tooltip="tooltipOptions" />
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
import { computed, ref, watch, onMounted, nextTick, onUnmounted } from "vue";
import { useI18n } from "../../composables/Core/useI18n.js";

// 存储跨页选中的行（用于"全选所有页"模式）
const allPagesSelectedRows = ref([]);

// Tooltip 配置选项（Element Plus 2.2.28+ 支持对象配置）
const tooltipOptions = {
  placement: "top",
  openDelay: 500,
};

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
  /**
   * 选择范围：'current' 表示当前页，'all' 表示所有页，null 表示未选择
   * @type {String|null}
   * @default null
   */
  selectionScope: {
    type: String,
    default: null,
  },
});

const { t } = useI18n();

const emit = defineEmits(["operation", "selection-change"]);

const tableRef = ref(null);

// 创建一个 WeakMap 来存储每行数据的唯一标识
const rowKeyMap = new WeakMap();
let rowKeyCounter = 0;

/**
 * 获取行的唯一标识
 * 使用 WeakMap 为每行数据分配唯一的 key，确保即使 keyName 相同，每一行也有唯一的标识
 */
const getRowKey = (row) => {
  // 首先尝试使用 id（如果存在）
  if (row.id) {
    return row.id;
  }

  // 如果 WeakMap 中已有该行的 key，直接返回
  if (rowKeyMap.has(row)) {
    return rowKeyMap.get(row);
  }

  // 如果还没有，为该行分配一个新的唯一 key
  const uniqueKey = `row-${rowKeyCounter++}`;
  rowKeyMap.set(row, uniqueKey);
  return uniqueKey;
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
  if (props.selectionScope === "all") {
    // 如果选择范围是"所有页"，需要维护跨页选中状态
    // 获取当前页的行 key
    const currentPageKeys = new Set(paginatedData.value.map((row) => getRowKey(row)));

    // 移除当前页之前选中的项
    allPagesSelectedRows.value = allPagesSelectedRows.value.filter(
      (row) => !currentPageKeys.has(getRowKey(row))
    );

    // 添加当前页新选中的项
    allPagesSelectedRows.value.push(...selection);

    // 发送所有页的选中项
    emit("selection-change", [...allPagesSelectedRows.value]);
  } else {
    // 如果选择范围是"当前页"或未选择，只发送当前页的选中项
    allPagesSelectedRows.value = [];
    emit("selection-change", selection);
  }
};

// 用于标记是否正在执行全选操作，避免与 watch 冲突
const isSelectingAll = ref(false);

/**
 * 处理全选（暴露给父组件调用）
 * @param {string} scope - 'current' 或 'all'
 */
const handleSelectAll = (scope) => {
  if (!tableRef.value) return;

  isSelectingAll.value = true;

  if (scope === "current") {
    // 全选当前页
    allPagesSelectedRows.value = [];
    nextTick(() => {
      tableRef.value.clearSelection();
      paginatedData.value.forEach((row) => {
        tableRef.value.toggleRowSelection(row, true);
      });
      // 发送当前页的选中项
      emit("selection-change", [...paginatedData.value]);
      isSelectingAll.value = false;
    });
  } else if (scope === "all") {
    // 全选所有页：选择所有数据
    allPagesSelectedRows.value = [...props.data];
    nextTick(() => {
      // 选择当前页的所有行（视觉反馈）
      tableRef.value.clearSelection();
      paginatedData.value.forEach((row) => {
        tableRef.value.toggleRowSelection(row, true);
      });
      // 发送所有数据作为选中项
      emit("selection-change", [...props.data]);
      isSelectingAll.value = false;
    });
  }
};

// 监听分页变化，恢复当前页的选中状态（用于"全选所有页"模式）
watch(
  () => [currentPage.value, props.selectionScope],
  (newVal, oldVal) => {
    // 如果正在执行全选操作，跳过 watch 逻辑
    if (isSelectingAll.value) return;

    const [newPage, newScope] = newVal;
    const [oldPage, oldScope] = oldVal || [1, "current"];

    // 只在分页变化时恢复选中状态（选择范围变化由 handleSelectAll 处理）
    if (newPage !== oldPage && props.selectionScope === "all" && tableRef.value) {
      nextTick(() => {
        tableRef.value.clearSelection();
        const currentPageKeys = new Set(paginatedData.value.map((row) => getRowKey(row)));
        // 恢复当前页的选中状态
        paginatedData.value.forEach((row) => {
          const rowKey = getRowKey(row);
          const isSelected = allPagesSelectedRows.value.some(
            (selectedRow) => getRowKey(selectedRow) === rowKey
          );
          if (isSelected) {
            tableRef.value.toggleRowSelection(row, true);
          }
        });
      });
    }
  }
);

// 暴露方法给父组件
defineExpose({
  handleSelectAll,
});

/**
 * 移除页面大小选择器中的 "/page" 文本，只显示数字
 */
const removePageText = () => {
  // 使用 requestAnimationFrame 优化性能
  requestAnimationFrame(() => {
    // 移除选中项中的 "/page" 文本
    const wrapper = document.querySelector(".library-table-wrapper");
    if (!wrapper) return;

    // 处理选中项（只查询 wrapper 内的，减少查询范围）
    const selectedItems = wrapper.querySelectorAll(
      ".el-pagination .el-select .el-select__selected-item"
    );
    selectedItems.forEach((item) => {
      if (item.textContent && item.textContent.includes("/page")) {
        item.textContent = item.textContent.replace("/page", "");
      }
    });

    // 处理下拉选项（只查询当前可见的下拉菜单）
    const allDropdownItems = document.querySelectorAll(
      ".el-select-dropdown:not([style*='display: none']) .el-select-dropdown__item"
    );
    allDropdownItems.forEach((item) => {
      // 只处理包含数字的选项（如 "5/page", "10/page" 等）
      const text = item.textContent?.trim() || "";
      if (text && /^\d+\/page$/.test(text)) {
        item.textContent = text.replace("/page", "");
      }
    });
  });
};

// 监听页面大小变化，更新文本
watch(pageSize, () => {
  removePageText();
});

let observer = null;
let bodyObserver = null;
let intervalId = null;
let removePageTextTimer = null;

// 防抖版本的 removePageText
const debouncedRemovePageText = () => {
  if (removePageTextTimer) {
    clearTimeout(removePageTextTimer);
  }
  removePageTextTimer = setTimeout(() => {
    removePageText();
  }, 150);
};

onMounted(() => {
  removePageText();

  // 使用 MutationObserver 监听 DOM 变化
  // 只监听 wrapper 内的变化，避免监听整个 body
  nextTick(() => {
    const wrapper = document.querySelector(".library-table-wrapper");
    if (wrapper) {
      observer = new MutationObserver(() => {
        debouncedRemovePageText();
      });

      // 只监听 wrapper 内的变化
      observer.observe(wrapper, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    // 单独监听 body 中下拉菜单的出现（更精确的监听）
    bodyObserver = new MutationObserver((mutations) => {
      // 只处理下拉菜单相关的变化
      const hasDropdown = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === 1 &&
            node.classList?.contains("el-select-dropdown")
        );
      });
      if (hasDropdown) {
        debouncedRemovePageText();
      }
    });

    // 只监听 body 的直接子元素变化，减少监听范围
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: false, // 不监听深层变化
    });
  });

  // 降低检查频率，从 100ms 改为 300ms，减少性能开销
  intervalId = setInterval(() => {
    removePageText();
  }, 300);
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
  if (bodyObserver) {
    bodyObserver.disconnect();
  }
  if (intervalId) {
    clearInterval(intervalId);
  }
  if (removePageTextTimer) {
    clearTimeout(removePageTextTimer);
  }
});
</script>

<style lang="scss" scoped>
.library-table-wrapper {
  border-top: 1px solid #f0f0f0;
  --table-row-height: 50px;
  display: flex;
  flex-direction: column;
  height: 450px;
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

/* 页面大小选择器样式优化 */
:deep(.el-pagination .el-select) {
  .el-select__selected-item {
    /* 确保文本正确显示 */
    text-align: left;
  }
}
</style>
