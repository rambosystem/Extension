import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";
import { useApiStore } from "../../stores/settings/api.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import {
  getAvailableLanguages,
  getLanguageIso,
} from "../../config/languages.js";
import { ref, reactive } from "vue";
import { uploadTranslationKeys } from "../../requests/lokalise.js";

const { t } = useI18n();

/**
 * Lokalise上传功能Hook
 */
export function useLokaliseUpload() {
  const apiStore = useApiStore();
  const uploadStore = useUploadStore();

  // 项目列表
  const projectList = ref([]);

  // 上传loading状态
  const isUploading = ref(false);

  // 上传成功状态
  const isUploadSuccess = ref(false);

  // 成功消息
  const successMessage = ref("");

  // 选中的项目信息
  const currentProject = ref(null);

  /**
   * 显示上传设置弹窗
   */
  const showUploadDialog = () => {
    // 加载项目列表
    loadProjectList();
    uploadStore.openUploadDialog();
  };

  /**
   * 加载项目列表
   */
  const loadProjectList = () => {
    try {
      const projects = localStorage.getItem("lokalise_projects");
      if (projects) {
        const parsedProjects = JSON.parse(projects);
        if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
          projectList.value = parsedProjects;
          // 如果有保存的项目ID，尝试恢复
          const savedProjectId = localStorage.getItem(
            "lokalise_upload_project_id"
          );
          if (savedProjectId) {
            uploadStore.setUploadProjectId(savedProjectId);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load project list:", error);
      projectList.value = [];
    }
  };

  /**
   * 保存上传设置
   */
  const saveUploadSettings = () => {
    if (uploadStore.uploadForm.projectId) {
      localStorage.setItem(
        "lokalise_upload_project_id",
        uploadStore.uploadForm.projectId
      );
    }
    if (uploadStore.uploadForm.tag) {
      localStorage.setItem("lokalise_upload_tag", uploadStore.uploadForm.tag);
    }
  };

  /**
   * 加载上传设置
   */
  const loadUploadSettings = () => {
    const savedProjectId = localStorage.getItem("lokalise_upload_project_id");
    const savedTag = localStorage.getItem("lokalise_upload_tag");

    if (savedProjectId) {
      uploadForm.projectId = savedProjectId;
    }
    if (savedTag) {
      uploadForm.tag = savedTag;
    }
  };

  /**
   * 处理项目选择变化
   */
  const handleProjectChange = () => {
    saveUploadSettings();
  };

  /**
   * 处理标签输入变化
   */
  const handleTagChange = () => {
    saveUploadSettings();
  };

  /**
   * 关闭弹窗
   */
  const closeUploadDialog = () => {
    uploadDialogVisible.value = false;
    // 重置所有状态
    isUploading.value = false;
    isUploadSuccess.value = false;
    successMessage.value = "";
    currentProject.value = null;
  };

  /**
   * 生成自增序列key
   * @param {string} baselineKey - 基准key（如"key1"）
   * @param {number} index - 当前索引
   * @returns {string} 生成的key
   */
  const generateIncrementalKey = (baselineKey, index) => {
    // 提取基准key的字母部分和数字部分
    const match = baselineKey.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) {
      return baselineKey; // 如果格式不正确，返回原值
    }

    const [, prefix, numberStr] = match;
    const baseNumber = parseInt(numberStr, 10);
    const newNumber = baseNumber + index;

    return `${prefix}${newNumber}`;
  };

  /**
   * 清空baseline key
   */
  const clearBaselineKey = () => {
    try {
      // 使用 store 的方法清空 baseline key
      uploadStore.saveExcelBaselineKey("");

      // 触发事件通知其他组件baseline key已被清空
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("baselineKeyCleared"));
      }
    } catch (error) {
      console.error("Failed to clear baseline key:", error);
    }
  };

  /**
   * 执行上传
   */
  const executeUpload = async (translationResult) => {
    if (!translationResult || translationResult.length === 0) {
      ElMessage.warning("No translation data to upload");
      return;
    }

    // 检查翻译结果的语言配置是否与当前配置匹配
    if (!uploadStore.checkTranslationConfigMatch(translationResult)) {
      ElMessage.warning(
        "The translation data does not match the current language configuration. Please translate again."
      );
      return;
    }

    if (!uploadStore.uploadForm.projectId) {
      ElMessage.warning("Please select a project");
      return;
    }

    // 获取选中的项目信息
    const selectedProject = projectList.value.find(
      (p) => p.project_id === uploadStore.uploadForm.projectId
    );
    if (!selectedProject) {
      ElMessage.error("Selected project not found");
      return;
    }

    // 保存项目信息，用于下载链接
    currentProject.value = selectedProject;

    try {
      // 设置loading状态
      isUploading.value = true;

      // 检查API token是否配置
      const apiToken =
        localStorage.getItem("lokalise_api_token") || apiStore.lokaliseApiToken;

      if (!apiToken || !apiToken.trim()) {
        throw new Error(
          "Lokalise API token not found. Please configure your API token first."
        );
      }

      // 获取baseline key
      const baselineKey = localStorage.getItem("excel_baseline_key") || "";

      // 获取选中的目标语言（从 localStorage 获取，与翻译逻辑保持一致）
      let targetLanguages = [];
      try {
        targetLanguages = JSON.parse(
          localStorage.getItem("target_languages") || "[]"
        );
      } catch (error) {
        console.error("Failed to parse target languages:", error);
      }
      const availableLanguages = getAvailableLanguages();
      const sortedLanguages = availableLanguages.filter((availLang) =>
        targetLanguages.includes(availLang.code)
      );

      // 构建请求体
      const keys = translationResult.map((row, index) => {
        // 根据baseline key是否为空决定key的生成方式
        let keyName;
        if (baselineKey && baselineKey.trim()) {
          // 如果baseline key不为空，使用自增序列
          keyName = generateIncrementalKey(baselineKey.trim(), index);
        } else {
          // 如果baseline key为空，使用en作为key
          keyName = row.en;
        }

        // 构建translations数组：先添加英文，然后按顺序添加目标语言
        const translations = [
          {
            language_iso: "en",
            translation: row.en,
          },
        ];

        // 添加目标语言的翻译
        sortedLanguages.forEach((lang) => {
          const prop = lang.code.toLowerCase().replace(/\s+/g, "_");
          if (row[prop]) {
            translations.push({
              language_iso: lang.iso,
              translation: row[prop],
            });
          }
        });

        const keyData = {
          key_name: keyName,
          platforms: ["web", "other"],
          translations: translations,
        };

        // 如果有标签，添加到key中
        if (uploadStore.uploadForm.tag && uploadStore.uploadForm.tag.trim()) {
          keyData.tags = [uploadStore.uploadForm.tag.trim()];
        }

        return keyData;
      });

      // 准备tags数组（作为第三个参数传递给API）
      const tags =
        uploadStore.uploadForm.tag && uploadStore.uploadForm.tag.trim()
          ? [uploadStore.uploadForm.tag.trim()]
          : [];

      // 调用真正的上传API
      const result = await uploadTranslationKeys(
        uploadStore.uploadForm.projectId,
        keys,
        tags,
        apiToken
      );

      // 设置成功状态和消息
      successMessage.value = `Successfully uploaded ${keys.length} keys to project: ${selectedProject.name}`;
      isUploadSuccess.value = true;

      // 上传完成后清空baseline key
      clearBaselineKey();
    } catch (error) {
      // 显示详细的错误信息
      const errorMessage =
        error?.message || error?.toString() || "Upload failed";
      ElMessage.error({
        message: errorMessage,
        duration: 5000, // 显示5秒后自动消失
      });
    } finally {
      // 重置loading状态
      isUploading.value = false;
    }
  };

  /**
   * 直接上传翻译结果到Lokalise（保留原有方法，但暂时不调用）
   */
  const uploadToLokalise = async (translationResult) => {
    // 显示上传设置弹窗
    showUploadDialog();
  };

  // 初始化时加载设置
  loadUploadSettings();

  return {
    // 状态
    uploadDialogVisible: computed(() => uploadStore.uploadDialogVisible),
    uploadForm: computed(() => uploadStore.uploadForm),
    projectList,
    isUploading,
    isUploadSuccess,
    successMessage,
    currentProject,

    // 方法
    showUploadDialog,
    closeUploadDialog,
    executeUpload,
    uploadToLokalise,
    handleProjectChange,
    handleTagChange,
  };
}
