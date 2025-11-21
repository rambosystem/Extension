<template>
  <div>
    <h2 class="title">{{ t("translationSetting.translationSetting") }}</h2>
    <el-form-item
      v-if="hasLokaliseToken"
      :label="t('translationSetting.defaultProject')"
      label-position="left"
    >
      <div class="default-project-setting">
        <el-radio-group
          v-model="defaultProjectId"
          @change="handleDefaultProjectChange"
        >
          <el-radio
            v-for="project in projectList"
            :key="project.project_id"
            :label="project.project_id"
          >
            {{ project.name }}
          </el-radio>
        </el-radio-group>
      </div>
    </el-form-item>
    <el-form-item
      :label="t('translationSetting.exportKeySetting')"
      label-position="left"
    >
      <div class="excel-key-setting">
        <div class="input-container">
          <AutocompleteInput
            v-model="excelBaselineKey"
            :placeholder="t('translationSetting.exportKeySettingPlaceholder')"
            @blur="handleExcelBaselineKeyCancel"
            @focus="handleExcelBaselineKeyFocus"
            :get-project-id="getProjectId"
          />
        </div>
      </div>
    </el-form-item>
    <el-form-item v-show="excelBaselineKeyEditing">
      <div class="excel-key-setting-button-container">
        <el-button
          @click="handleExcelBaselineKeyClear"
          style="min-width: 90px"
          >{{ t("common.clear") }}</el-button
        >
        <el-button
          type="primary"
          @click="handleExcelBaselineKeySave"
          style="min-width: 90px"
          >{{ t("common.save") }}</el-button
        >
      </div>
    </el-form-item>
    <el-form-item
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
    </el-form-item>
  </div>
</template>

<script setup>
import { useI18n } from "../../composables/Core/useI18n.js";
import { useExportStore } from "../../stores/translation/export.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { useApiStore } from "../../stores/settings/api.js";
import { ref, watch, computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import AutocompleteInput from "../Common/AutocompleteInput.vue";
import { debugLog, debugError } from "../../utils/debug.js";

const { t } = useI18n();

// 使用 Translation store
const exportStore = useExportStore();
const uploadStore = useUploadStore();
const apiStore = useApiStore();

const excelBaselineKeyEditing = ref(false);
const isSaving = ref(false);
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

// 检查是否配置了 Lokalise Token
const hasLokaliseToken = computed(() => apiStore.hasLokaliseToken);

// 使用 computed 来获取默认项目ID
const defaultProjectId = computed({
  get: () => exportStore.defaultProjectId,
  set: (value) => {
    exportStore.updateDefaultProjectId(value);
  },
});

//excelBaselineKey变动时，设置excelBaselineKeyEditing为true，空值时设置为false
watch(
  () => excelBaselineKey.value,
  (newValue) => {
    // 有值时显示按钮，空值时隐藏按钮
    if (newValue && newValue.trim()) {
      excelBaselineKeyEditing.value = true;
    } else {
      excelBaselineKeyEditing.value = false;
    }
  }
);

/**
 * 获取项目ID的函数
 */
const getProjectId = () => {
  return (
    uploadStore.uploadForm.projectId ||
    localStorage.getItem("lokalise_upload_project_id") ||
    "2582110965ade9652de217.13653519"
  );
};

const handleExcelBaselineKeySave = () => {
  if (!excelBaselineKeyEditing.value) return;

  const currentValue = excelBaselineKey.value || "";

  // 检查是否为空
  if (!currentValue.trim()) {
    ElMessage.warning(t("translationSetting.exportBaselineKeySaveWarning"));
    return;
  }

  isSaving.value = true;

  const success = exportStore.saveExcelBaselineKey(currentValue);
  if (success) {
    excelBaselineKeyEditing.value = false;
  }

  isSaving.value = false;
};

const handleExcelBaselineKeyFocus = () => {
  excelBaselineKeyEditing.value = true;
};

const handleExcelBaselineKeyCancel = () => {
  // 如果正在保存，不处理失焦
  if (isSaving.value) return;

  // 延迟处理，给用户时间点击保存按钮
  setTimeout(() => {
    if (excelBaselineKeyEditing.value && !isSaving.value) {
      // 失焦时清空值并隐藏按钮
      excelBaselineKey.value = "";
      excelBaselineKeyEditing.value = false;
    }
  }, 200);
};

const handleExcelBaselineKeyClear = () => {
  excelBaselineKey.value = "";
  excelBaselineKeyEditing.value = false;
  // 清空存储
  exportStore.saveExcelBaselineKey("");
};

const handleOverwriteChange = (value) => {
  // 使用 translation store 的方法更新状态
  exportStore.updateExcelOverwrite(value);
};

/**
 * 处理默认项目变化
 * @param {string} projectId - 项目ID
 */
const handleDefaultProjectChange = (projectId) => {
  debugLog("[TranslationSetting] Default project changed to:", projectId);
  exportStore.updateDefaultProjectId(projectId);
};

/**
 * 加载项目列表
 */
const loadProjectList = () => {
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
            exportStore.updateDefaultProjectId(parsedProjects[0].project_id);
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

.excel-key-setting-button-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.excel-overwrite-setting {
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
</style>
