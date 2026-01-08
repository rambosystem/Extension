<template>
  <div>
    <h2 class="title">{{ t("translationSetting.translationSetting") }}</h2>
    <el-form-item v-if="hasLokaliseToken" :label="t('translationSetting.defaultProject')" label-position="left">
      <div class="default-project-setting">
        <el-radio-group v-model="defaultProjectId">
          <el-radio v-for="project in projectList" :key="project.project_id" :label="project.project_id">
            {{ project.name }}
          </el-radio>
        </el-radio-group>
      </div>
    </el-form-item>
    <el-form-item :label="t('translationSetting.targetLanguage')" label-position="left">
      <div class="target-language-setting">
        <el-checkbox-group v-model="targetLanguages" @change="handleTargetLanguagesChange">
          <el-checkbox v-for="lang in availableLanguages" :key="lang.code" :label="lang.code">
            {{ lang.name }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </el-form-item>
    <el-form-item :label="t('translationSetting.exportKeySetting')" label-position="left">
      <div class="excel-key-setting">
        <div class="input-container">
          <AutocompleteInput v-model="excelBaselineKey"
            :placeholder="t('translationSetting.exportKeySettingPlaceholder')" :get-project-id="getProjectId"
            :show-dropdown="true" :dropdown-limit="10" :fetch-suggestions-list="fetchBaselineKeySuggestions"
            @blur="handleExcelBaselineKeyBlur" />
        </div>
      </div>
    </el-form-item>
    <!-- <el-form-item
      :label="t('translationSetting.overwrite')"
      label-position="left"
    >
      <div class="excel-overwrite-setting">
        <el-switch
          v-model="Overwrite"
          @change="handleOverwriteChange"
          width="45px"
        />
      </div>
    </el-form-item> -->
  </div>
</template>

<script setup>
import { useI18n } from "../../composables/Core/useI18n.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { useApiStore } from "../../stores/settings/api.js";
import { ref, watch, computed, onMounted, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import AutocompleteInput from "../Common/AutocompleteInput.vue";
import { debugLog, debugError } from "../../utils/debug.js";
import { getAvailableLanguages } from "../../config/languages.js";
import { autocompleteKeys } from "../../requests/autocomplete.js";

const { t } = useI18n();

// 使用 Translation store
const exportStore = useExportStore();
const uploadStore = useUploadStore();
const apiStore = useApiStore();

const projectList = ref([]);

// 使用 computed 来获取 store 中的状态
const excelBaselineKey = computed({
  get: () => exportStore.excelBaselineKey,
  set: (value) => {
    exportStore.excelBaselineKey = value;
  },
});

// 使用 computed 来获取 Overwrite 状态
const Overwrite = computed({
  get: () => exportStore.excelOverwrite,
  set: (value) => {
    exportStore.excelOverwrite = value;
  },
});

// 使用 computed 来获取目标语言状态
const targetLanguages = computed({
  get: () => exportStore.targetLanguages,
  set: (value) => {
    exportStore.updateTargetLanguages(value);
  },
});

// 从配置文件获取可用语言列表
const availableLanguages = computed(() => getAvailableLanguages());

// 检查是否配置了 Lokalise Token
const hasLokaliseToken = computed(() => apiStore.hasLokaliseToken);

// 使用 computed 来获取默认项目ID
// 注意：v-model 会触发 setter，不需要额外的 @change 事件
const defaultProjectId = computed({
  get: () => exportStore.defaultProjectId,
  set: async (value) => {
    await exportStore.updateDefaultProjectId(value);
  },
});

/**
 * 处理Baseline Key失焦事件 - 失焦时进行校验和保存
 */
const handleExcelBaselineKeyBlur = async () => {
  const currentValue = excelBaselineKey.value || "";

  // 如果值为空，直接清空存储
  if (!currentValue.trim()) {
    await exportStore.saveExcelBaselineKey("");
    return;
  }

  // 调用store的保存方法，它会进行格式校验和唯一性校验并显示提示
  const success = await exportStore.saveExcelBaselineKey(currentValue.trim());

  // 如果校验失败，清空输入框
  if (!success) {
    excelBaselineKey.value = "";
  }
};

/**
 * 获取项目ID的函数
 * 全局统一使用 Default Project 的值
 */
const getProjectId = () => {
  // 只使用默认项目ID（从 Translation Setting 中选择的）
  if (exportStore.defaultProjectId) {
    debugLog(
      "[TranslationSetting] Using default project ID for autocomplete:",
      exportStore.defaultProjectId
    );
    return exportStore.defaultProjectId;
  }

  // 如果没有默认项目ID，返回 null，让自动补全逻辑处理
  debugLog(
    "[TranslationSetting] No default project ID set, autocomplete will use fallback"
  );
  return null;
};

/**
 * 获取Baseline Key建议列表（用于下拉菜单）
 * @param {string} queryString - 搜索关键词
 * @param {string} projectId - 项目ID
 * @param {number} limit - 返回结果数量限制
 * @returns {Promise<Array<string>>} 建议的key名称列表
 */
const fetchBaselineKeySuggestions = async (queryString, projectId, limit = 10) => {
  try {
    debugLog("[Baseline Key Dropdown] Calling API with:", {
      projectId,
      query: queryString.trim(),
      limit,
    });

    const response = await autocompleteKeys(projectId, queryString.trim(), limit);

    debugLog("[Baseline Key Dropdown] API response:", response);

    // 返回所有结果的key_name列表
    if (response?.results && Array.isArray(response.results)) {
      const suggestions = response.results
        .map((result) => result.key_name)
        .filter((key) => key); // 过滤掉空值
      debugLog("[Baseline Key Dropdown] Suggestions:", suggestions);
      return suggestions;
    }
    return [];
  } catch (error) {
    debugError("[Baseline Key Dropdown] Error occurred:", error);
    return [];
  }
};

const handleOverwriteChange = (value) => {
  // 使用 translation store 的方法更新状态
  exportStore.updateExcelOverwrite(value);
};

/**
 * 处理目标语言变化
 * @param {Array<string>} languages - 选中的语言数组
 */
const handleTargetLanguagesChange = (languages) => {
  debugLog("[TranslationSetting] Target languages changed to:", languages);

  // 确保至少选择一个语言
  if (!languages || languages.length === 0) {
    ElMessage.warning(t("translationSetting.atLeastOneLanguageRequired"));
    // 恢复之前的选择
    return;
  }

  const success = exportStore.updateTargetLanguages(languages);
  if (!success) {
    ElMessage.warning(t("translationSetting.atLeastOneLanguageRequired"));
    // 恢复之前的选择，强制更新 UI
    targetLanguages.value = exportStore.targetLanguages;
  }
};

/**
 * 加载项目列表
 */
const loadProjectList = async () => {
  try {
    debugLog("[TranslationSetting] Loading project list...");
    const projects = localStorage.getItem("lokalise_projects");
    if (projects) {
      const parsedProjects = JSON.parse(projects);
      debugLog("[TranslationSetting] Parsed projects:", parsedProjects);
      if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
        projectList.value = parsedProjects;

        const currentProjectId = exportStore.defaultProjectId;
        debugLog("[TranslationSetting] Current project ID:", currentProjectId);
        // 检查当前选择的项目是否还在列表中
        const currentProjectExists = parsedProjects.some(
          (p) => p.project_id === currentProjectId
        );

        // 如果当前项目不在列表中，或者没有保存的默认项目，设置第一个为默认
        if (!currentProjectExists || !currentProjectId) {
          if (parsedProjects[0]?.project_id) {
            debugLog(
              "[TranslationSetting] Setting default project to:",
              parsedProjects[0].project_id
            );
            await exportStore.updateDefaultProjectId(parsedProjects[0].project_id);
          }
        } else {
          debugLog(
            "[TranslationSetting] Current project exists in list, keeping selection"
          );
        }
      } else {
        debugLog("[TranslationSetting] No projects found in parsed data");
        projectList.value = [];
      }
    } else {
      debugLog("[TranslationSetting] No projects in localStorage");
      projectList.value = [];
    }
  } catch (error) {
    debugError("[TranslationSetting] Failed to load project list:", error);
    projectList.value = [];
  }
};

// 组件挂载时初始化 store
onMounted(() => {
  debugLog("[TranslationSetting] Component mounted, initializing stores...");
  // 确保 API store 已初始化
  apiStore.initializeApiSettings();
  debugLog(
    "[TranslationSetting] API Store initialized. hasLokaliseToken:",
    apiStore.hasLokaliseToken
  );

  exportStore.initializeTranslationSettings();
  debugLog(
    "[TranslationSetting] Export Store initialized. defaultProjectId:",
    exportStore.defaultProjectId
  );

  // 确保上传store已初始化，以便获取projectId
  uploadStore.initializeUploadSettings();

  // 如果配置了 Lokalise Token，加载项目列表
  if (apiStore.hasLokaliseToken) {
    debugLog("[TranslationSetting] Lokalise Token found, loading project list");
    loadProjectList();
  } else {
    debugLog("[TranslationSetting] No Lokalise Token found");
  }
});

// 监听 Lokalise Token 变化，如果配置了则加载项目列表
watch(
  () => apiStore.hasLokaliseToken,
  (hasToken) => {
    debugLog("[TranslationSetting] Lokalise Token status changed:", hasToken);
    if (hasToken) {
      loadProjectList();
    } else {
      projectList.value = [];
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.title {
  font-size: 24px;
  margin-bottom: 20px;
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

.excel-overwrite-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.target-language-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

.default-project-setting {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

:deep(.el-radio) {
  margin-right: 0;
  white-space: nowrap;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

:deep(.el-checkbox) {
  margin-right: 0;
  white-space: nowrap;
}
</style>
