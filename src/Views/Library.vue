<template>
  <div class="library_group">
    <h2 class="title">{{ t("library.title") }}</h2>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <!-- 工具提示标签 -->
      <div v-if="showKeyNameTooltip" class="filter-tooltip">
        {{ t("library.filterKeyName") }}
        <div class="tooltip-arrow"></div>
      </div>
      <el-form :inline="true" class="filter-form">
        <el-form-item :label="t('library.filterKeyName')">
          <div class="filter-input-wrapper" ref="keyNameInputRef">
            <div
              class="filter-input-container"
              :class="{ active: showKeyNamePopup }"
              @click="handleKeyNameClick"
            >
              <div
                class="filter-condition-selector"
                @click.stop="showConditionDropdown = !showConditionDropdown"
              >
                <span class="condition-text">{{ filterConditionText }}</span>
                <el-icon class="condition-icon"><ArrowDown /></el-icon>
                <!-- 条件选择下拉 -->
                <div
                  v-if="showConditionDropdown"
                  class="condition-dropdown"
                  @click.stop
                >
                  <div
                    v-for="condition in filterConditions"
                    :key="condition.value"
                    class="condition-option"
                    :class="{ active: filterCondition === condition.value }"
                    @click="selectCondition(condition.value)"
                  >
                    {{ condition.label }}
                  </div>
                </div>
              </div>
              <input
                v-model="filterKeyNameDisplay"
                type="text"
                class="filter-text-input"
                :placeholder="t('library.filterKeyNamePlaceholder')"
                readonly
                @focus="showKeyNamePopup = true"
              />
            </div>
            <!-- Key Name 多行输入弹窗 -->
            <div v-if="showKeyNamePopup" class="key-name-popup" @click.stop>
              <el-input
                v-model="filterKeyName"
                type="textarea"
                :rows="6"
                :placeholder="t('library.keyNamePopupPlaceholder')"
                class="popup-textarea"
                @blur="handleKeyNameBlur"
              />
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="t('library.filterProject')">
          <el-select
            v-model="filterProject"
            :placeholder="t('library.filterProjectPlaceholder')"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option :label="t('library.selectAll')" value="" />
            <el-option
              v-for="project in projectList"
              :key="project.project_id"
              :label="project.name"
              :value="project.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleClear">{{ t("library.clear") }}</el-button>
          <el-button type="primary" @click="handleSearch">
            {{ t("library.search") }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区域 -->
    <div class="table-section">
      <h3 class="table-title">{{ t("library.tableTitle") }}</h3>
      <el-table
        :data="tableData"
        style="width: 100%"
        v-loading="loading"
        :element-loading-text="t('common.loading')"
        stripe
        border
      >
        <el-table-column
          prop="keyName"
          :label="t('library.keyName')"
          width="200"
        />
        <el-table-column
          prop="project"
          :label="t('library.project')"
          width="150"
        />
        <el-table-column
          prop="english"
          :label="t('library.english')"
          min-width="200"
        />
        <el-table-column
          prop="chinese"
          :label="t('library.chinese')"
          min-width="200"
        />
        <el-table-column
          prop="spanish"
          :label="t('library.spanish')"
          min-width="200"
        />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from "vue";
import { useI18n } from "../composables/Core/useI18n.js";
import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { getUserProjects } from "../requests/lokalise.js";

const { t } = useI18n();

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

// 状态管理
const loading = ref(false);
const tableData = ref([]);
const projectList = ref([]);

// 筛选条件
const filterKeyName = ref("");
const filterProject = ref("");
const showKeyNamePopup = ref(false);
const showKeyNameTooltip = ref(false);
const showConditionDropdown = ref(false);
const keyNameInputRef = ref(null);

// 筛选条件选项
const filterConditions = [
  { label: "Contains(or)", value: "contains_or" },
  { label: "Contains(and)", value: "contains_and" },
  { label: "Equals", value: "equals" },
  { label: "Starts with", value: "starts_with" },
  { label: "Ends with", value: "ends_with" },
];

const filterCondition = ref("contains_or");

// 获取当前筛选条件的显示文本
const filterConditionText = computed(() => {
  const condition = filterConditions.find(
    (c) => c.value === filterCondition.value
  );
  return condition ? condition.label : "Contains(or)";
});

// Key Name 显示值（单行显示，截取第一行）
const filterKeyNameDisplay = computed(() => {
  if (!filterKeyName.value) return "";
  const firstLine = filterKeyName.value.split("\n")[0].trim();
  if (filterKeyName.value.split("\n").length > 1) {
    return `${firstLine}...`;
  }
  return firstLine;
});

/**
 * 加载项目列表
 * 优先从 localStorage 读取，如果没有则从 API 获取
 */
const loadProjectList = async () => {
  try {
    // 先从 localStorage 获取已保存的项目列表
    const savedProjects = localStorage.getItem("lokalise_projects");
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          projectList.value = parsedProjects;
          return;
        }
      } catch (e) {
        console.warn("Failed to parse saved projects:", e);
      }
    }

    // 如果 localStorage 中没有，尝试从 API 获取
    try {
      const projects = await getUserProjects();
      projectList.value = projects;
      // 保存到 localStorage
      localStorage.setItem("lokalise_projects", JSON.stringify(projects));
    } catch (error) {
      console.warn("Failed to fetch projects from API:", error);
      projectList.value = [];
    }
  } catch (error) {
    console.error("Failed to load project list:", error);
    projectList.value = [];
  }
};

/**
 * 加载表格数据
 * TODO: 后续替换为真实API调用
 */
const loadTableData = async () => {
  loading.value = true;
  try {
    // 模拟数据，后续替换为真实API
    // const data = await fetchTranslationKeys();
    // tableData.value = data;

    // 临时模拟数据
    tableData.value = [
      {
        keyName: "common.welcome",
        project: "Common",
        english: "Welcome",
        chinese: "欢迎",
        spanish: "Bienvenido",
      },
      {
        keyName: "common.save",
        project: "Common",
        english: "Save",
        chinese: "保存",
        spanish: "Guardar",
      },
      {
        keyName: "search.title",
        project: "AmazonSearch",
        english: "Search Products",
        chinese: "搜索产品",
        spanish: "Buscar Productos",
      },
      {
        keyName: "commerce.addToCart",
        project: "Commerce",
        english: "Add to Cart",
        chinese: "加入购物车",
        spanish: "Añadir al carrito",
      },
    ];
  } catch (error) {
    console.error("Failed to load translation keys:", error);
    ElMessage.error(t("library.loadFailed"));
  } finally {
    loading.value = false;
  }
};

/**
 * 处理 Key Name 输入框点击
 */
const handleKeyNameClick = () => {
  showKeyNamePopup.value = true;
  showKeyNameTooltip.value = true;
  showConditionDropdown.value = false;
};

/**
 * 选择筛选条件
 */
const selectCondition = (value) => {
  filterCondition.value = value;
  showConditionDropdown.value = false;
};

/**
 * 处理 Key Name 输入框失焦
 */
const handleKeyNameBlur = () => {
  // 延迟关闭弹窗，以便点击弹窗内部时不会立即关闭
  setTimeout(() => {
    showKeyNamePopup.value = false;
    showKeyNameTooltip.value = false;
  }, 200);
};

/**
 * 清除筛选条件
 */
const handleClear = () => {
  filterKeyName.value = "";
  filterProject.value = "";
  showKeyNamePopup.value = false;
  showKeyNameTooltip.value = false;
  showConditionDropdown.value = false;
};

/**
 * 执行搜索 - 调用后端API获取筛选后的数据
 */
const handleSearch = async () => {
  showKeyNamePopup.value = false;
  showKeyNameTooltip.value = false;
  showConditionDropdown.value = false;

  loading.value = true;
  try {
    // TODO: 调用后端API，传递筛选条件
    // const params = {
    //   keyNames: filterKeyName.value
    //     .split(/[\n,]/)
    //     .map((key) => key.trim())
    //     .filter((key) => key.length > 0),
    //   condition: filterCondition.value,
    //   project: filterProject.value || null,
    // };
    // const data = await fetchTranslationKeys(params);
    // tableData.value = data;

    // 临时：保持现有模拟数据，后续替换为真实API调用
    await loadTableData();
  } catch (error) {
    console.error("Failed to search translation keys:", error);
    ElMessage.error(t("library.loadFailed"));
  } finally {
    loading.value = false;
  }
};

/**
 * 表格数据 - 筛选由后端处理，这里直接显示数据
 */
const filteredTableData = computed(() => {
  return tableData.value;
});

// 点击外部关闭弹窗
const handleClickOutside = (event) => {
  if (keyNameInputRef.value) {
    const element = keyNameInputRef.value;
    if (element && !element.contains(event.target)) {
      showKeyNamePopup.value = false;
      showKeyNameTooltip.value = false;
      showConditionDropdown.value = false;
    }
  }
};

onMounted(() => {
  loadProjectList();
  loadTableData();
  // 添加全局点击事件监听
  nextTick(() => {
    document.addEventListener("click", handleClickOutside);
  });
});

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
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
  margin-bottom: 24px;
  padding: 20px 0;
  position: relative;
}

.filter-form {
  margin: 0;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 20px;
}

.filter-form :deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  padding: 0;
  margin-right: 8px;
  line-height: 32px;
}

.filter-input-wrapper {
  width: 300px;
  position: relative;
}

.filter-tooltip {
  position: absolute;
  top: -32px;
  left: 0;
  background-color: #606266;
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1001;
  pointer-events: none;
}

.tooltip-arrow {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #606266;
}

.filter-input-container {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 4px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

.filter-input-container:hover {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

.filter-input-container.active {
  box-shadow: 0 0 0 1px #409eff inset;
}

.filter-condition-selector {
  display: flex;
  align-items: center;
  margin-right: 8px;
  padding: 0 4px;
  position: relative;
  cursor: pointer;
}

.condition-text {
  font-size: 14px;
  color: #409eff;
  margin-right: 4px;
  white-space: nowrap;
}

.condition-icon {
  font-size: 12px;
  color: #409eff;
  transition: transform 0.2s;
}

.condition-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  z-index: 1002;
  min-width: 150px;
  max-height: 200px;
  overflow-y: auto;
}

.condition-option {
  padding: 8px 12px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: background-color 0.2s;
}

.condition-option:hover {
  background-color: #f5f7fa;
}

.condition-option.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.filter-text-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #606266;
  background: transparent;
  cursor: pointer;
}

.filter-text-input::placeholder {
  color: #c0c4cc;
}

.filter-input {
  width: 100%;
}

.filter-input :deep(.el-input__inner) {
  cursor: pointer;
}

.filter-select {
  width: 100%;
}

.input-icon {
  cursor: pointer;
  color: #909399;
}

.key-name-popup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  background-color: #ffffff;
  border: 1px solid #409eff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 12px;
}

.popup-textarea {
  width: 100%;
}

.popup-textarea :deep(.el-textarea__inner) {
  font-family: inherit;
  resize: vertical;
  border: none;
  box-shadow: none;
  padding: 8px;
}

@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

.table-section {
  margin-top: 24px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

:deep(.el-table) {
  border: 1px solid #ebeef5;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
  color: #303133;
}

:deep(.el-table td) {
  padding: 12px 0;
}

.filter-input-wrapper {
  position: relative;
}
</style>
