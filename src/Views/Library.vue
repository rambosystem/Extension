<template>
  <div class="library_group">
    <h2 class="title">{{ t("library.title") }}</h2>

    <div class="filter-section">
      <div class="filter-conditions">
        <el-row :gutter="20" class="filter-form">
          <el-col :span="12">
            <div class="filter-input-wrapper" ref="keyNameInputRef">
              <div class="filter-input-container" :class="{ active: showKeyNamePopup }" @click="handleKeyNameClick">
                <span class="filter-label">{{ t('library.filterKeyName') }}</span>
                <span class="filter-separator">|</span>
                <div class="filter-condition-selector" @click.stop="showConditionDropdown = !showConditionDropdown">
                  <span class="condition-text">{{ filterConditionText }}</span>
                  <el-icon class="condition-icon">
                    <ArrowDown />
                  </el-icon>
                  <div v-if="showConditionDropdown" class="condition-dropdown" @click.stop>
                    <div v-for="condition in filterConditions" :key="condition.value" class="condition-option"
                      :class="{ active: filterCondition === condition.value }"
                      @click="selectCondition(condition.value)">
                      {{ condition.label }}
                    </div>
                  </div>
                </div>
                <input v-model="filterKeyNameDisplay" type="text" class="filter-text-input"
                  :placeholder="t('library.filterKeyNamePlaceholder')" readonly @focus="showKeyNamePopup = true" />
              </div>
              <div v-if="showKeyNamePopup" class="key-name-popup" @click.stop>
                <el-input v-model="filterKeyName" type="textarea" :rows="6"
                  :placeholder="t('library.keyNamePopupPlaceholder')" class="popup-textarea"
                  @blur="handleKeyNameBlur" />
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <el-select ref="projectSelectRef" v-model="filterProject" multiple
              :placeholder="t('library.filterProjectPlaceholder')" style="width: 100%"
              @visible-change="handleProjectSelectVisibleChange">
              <template #prefix>
                <span style="display: flex; align-items: center;">
                  <span class="filter-label">{{ t('library.filterProject') }}</span>
                  <span class="filter-separator">|</span>
                </span>
              </template>
              <el-option :label="t('library.selectAll')" value="__SELECT_ALL__" />
              <el-option v-for="project in projectList" :key="project.project_id" :label="project.name"
                :value="project.name" />
            </el-select>
          </el-col>
        </el-row>
      </div>
      <div class="filter-buttons">
        <el-button @click="handleClear">{{ t("library.clear") }}</el-button>
        <el-button type="primary" @click="handleSearch">
          {{ t("library.search") }}
        </el-button>
      </div>
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
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import { useI18n } from "../composables/Core/useI18n.js";
import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import { getUserProjects } from "../requests/lokalise.js";

const { t } = useI18n();

const loading = ref(false);
const tableData = ref([]);
const projectList = ref([]);
const filterKeyName = ref("");
const filterProject = ref([]);
const showKeyNamePopup = ref(false);
const showConditionDropdown = ref(false);
const keyNameInputRef = ref(null);
const projectSelectRef = ref(null);

const filterConditions = [
  { label: "Contains(or)", value: "contains_or" },
  { label: "Contains(and)", value: "contains_and" },
  { label: "Equals", value: "equals" },
  { label: "Starts with", value: "starts_with" },
  { label: "Ends with", value: "ends_with" },
];

const filterCondition = ref("contains_or");

const filterConditionText = computed(() => {
  const condition = filterConditions.find(
    (c) => c.value === filterCondition.value
  );
  return condition ? condition.label : "Contains(or)";
});

const filterKeyNameDisplay = computed(() => {
  if (!filterKeyName.value) return "";

  // 计算有效的 key name 数量（过滤空行和空白）
  const keyNames = filterKeyName.value
    .split(/[\n,]/)
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  if (keyNames.length === 0) return "";
  if (keyNames.length === 1) return keyNames[0];

  // 多个 key name 时显示 "N Key Names"
  return t("library.multipleKeyNames", { count: keyNames.length });
});

const loadProjectList = async () => {
  try {
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

    try {
      const projects = await getUserProjects();
      projectList.value = projects;
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

const handleProjectSelectVisibleChange = (visible) => {
  if (visible && projectList.value.length === 0) {
    nextTick(() => {
      if (projectSelectRef.value) {
        projectSelectRef.value.blur();
      }
    });
    ElMessage.warning(t("library.pleaseAuthorizeLokaliseToken"));
  }
};

// 监听项目选择变化，处理"Select All"逻辑
watch(
  filterProject,
  (newValue) => {
    if (!Array.isArray(newValue) || projectList.value.length === 0) return;

    const hasSelectAll = newValue.includes("__SELECT_ALL__");

    if (hasSelectAll) {
      // 如果选择了"Select All"，则选择所有项目（移除"__SELECT_ALL__"标记）
      const allProjectNames = projectList.value.map((p) => p.name);
      // 使用 nextTick 避免在 watch 中直接修改导致的问题
      nextTick(() => {
        filterProject.value = allProjectNames;
      });
    }
  },
  { deep: true }
);

const loadTableData = async () => {
  loading.value = true;
  try {
    // TODO: Replace with real API call
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

const handleKeyNameClick = () => {
  showKeyNamePopup.value = true;
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
  }, 200);
};

/**
 * 清除筛选条件
 */
const handleClear = () => {
  filterKeyName.value = "";
  filterProject.value = [];
  showKeyNamePopup.value = false;
  showConditionDropdown.value = false;
};

/**
 * 执行搜索 - 调用后端API获取筛选后的数据
 */
const handleSearch = async () => {
  showKeyNamePopup.value = false;
  showConditionDropdown.value = false;

  loading.value = true;
  try {
    // 处理项目筛选：移除"__SELECT_ALL__"标记，保留实际项目名称
    const selectedProjects = filterProject.value.filter(
      (p) => p !== "__SELECT_ALL__"
    );

    // TODO: 调用后端API，传递筛选条件
    // const params = {
    //   keyNames: filterKeyName.value
    //     .split(/[\n,]/)
    //     .map((key) => key.trim())
    //     .filter((key) => key.length > 0),
    //   condition: filterCondition.value,
    //   projects: selectedProjects.length > 0 ? selectedProjects : null,
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
  padding-top: 10px;
  position: relative;
}

.filter-conditions {
  margin-bottom: 20px;
  position: relative;
}

.filter-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.filter-form {
  margin: 0;
}

.filter-input-wrapper {
  width: 100%;
  position: relative;
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

  &:hover {
    box-shadow: 0 0 0 1px #c0c4cc inset;
  }

  &.active {
    box-shadow: 0 0 0 1px #409eff inset;
  }
}

.filter-label {
  display: flex;
  font-size: 14px;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
}

.filter-separator {
  margin: 0 8px;
  color: #dcdfe6;
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

  &:hover {
    background-color: #f5f7fa;
  }

  &.active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

.filter-text-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #606266;
  background: transparent;
  cursor: pointer;

  &::placeholder {
    color: #c0c4cc;
  }
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
}

.popup-textarea {
  width: 100%;
  height: 100%;

  :deep(.el-textarea__inner) {
    font-family: inherit;
    resize: vertical;
    border: none;
    box-shadow: none;
    padding: 8px;

    // 隐藏滚动条但保持滚动功能
    scrollbar-width: none; // Firefox
    -ms-overflow-style: none; // IE and Edge

    &::-webkit-scrollbar {
      display: none; // Chrome, Safari, Opera
    }
  }
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
