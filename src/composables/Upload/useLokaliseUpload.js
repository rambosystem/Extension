import { ElMessage } from "element-plus";
import { useI18n } from "../Core/useI18n.js";
import { useApiStore } from "../../stores/settings/api.js";
import { useUploadStore } from "../../stores/translation/upload.js";
import { useExportStore } from "../../stores/translation/export.js";
import {
  getAvailableLanguages,
  getLanguageIso,
} from "../../config/languages.js";
import { ref, reactive } from "vue";
import { uploadTranslationKeys } from "../../requests/lokalise.js";
import { searchKeysByNames } from "../../requests/deduplicate.js";

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
   * 解析 key 格式（如 "key1", "item5"）
   * @param {string} key - key 字符串
   * @returns {Object|null} { prefix: string, number: number } 或 null
   */
  const parseKey = (key) => {
    if (!key || typeof key !== "string") return null;
    const match = key.trim().match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      number: parseInt(match[2], 10),
    };
  };

  /**
   * 计算下一个 baseline key
   * 基于 translationResult 中使用的最大 key 值
   * @param {Array} translationResult - 翻译结果数组
   * @returns {string|null} 下一个 baseline key，如果无法计算则返回 null
   */
  const calculateNextBaselineKey = (translationResult) => {
    if (!translationResult || translationResult.length === 0) {
      console.log(
        "[useLokaliseUpload] No translation result provided for baseline key calculation"
      );
      return null;
    }

    const exportStore = useExportStore();
    const currentBaselineKey =
      exportStore.excelBaselineKey ||
      localStorage.getItem("excel_baseline_key") ||
      "";

    // 如果没有当前的 baseline key，无法计算下一个
    if (!currentBaselineKey || !currentBaselineKey.trim()) {
      console.log(
        "[useLokaliseUpload] No current baseline key found, cannot calculate next"
      );
      return null;
    }

    // 解析当前的 baseline key
    const parsed = parseKey(currentBaselineKey.trim());
    if (!parsed) {
      console.warn(
        "[useLokaliseUpload] Invalid baseline key format:",
        currentBaselineKey
      );
      return null;
    }

    const { prefix, number: baselineNumber } = parsed;

    // 从 translationResult 中提取所有符合格式的 key
    const usedNumbers = new Set();
    translationResult.forEach((row) => {
      const key = row?.key;
      if (key && typeof key === "string" && key.trim()) {
        const keyParsed = parseKey(key.trim());
        if (
          keyParsed &&
          keyParsed.prefix.toLowerCase() === prefix.toLowerCase()
        ) {
          usedNumbers.add(keyParsed.number);
        }
      }
    });

    console.log("[useLokaliseUpload] Baseline key calculation:", {
      currentBaselineKey,
      prefix,
      baselineNumber,
      usedNumbers: Array.from(usedNumbers),
      usedNumbersSize: usedNumbers.size,
    });

    // 如果没有找到已使用的 key，保持当前的 baseline key
    if (usedNumbers.size === 0) {
      console.log(
        "[useLokaliseUpload] No matching keys found, keeping current baseline key"
      );
      return currentBaselineKey;
    }

    // 找出最大的已使用数字
    const maxUsedNumber = Math.max(...usedNumbers);

    // 下一个 baseline key 应该是 maxUsedNumber + 1
    // 但要确保不小于 baselineNumber（如果 baselineNumber 更大，使用它）
    const nextNumber = Math.max(maxUsedNumber + 1, baselineNumber);
    const nextBaselineKey = `${prefix}${nextNumber}`;

    console.log("[useLokaliseUpload] Calculated next baseline key:", {
      maxUsedNumber,
      nextNumber,
      nextBaselineKey,
    });

    return nextBaselineKey;
  };

  /**
   * 清空baseline key
   */
  const clearBaselineKey = async () => {
    console.log("[useLokaliseUpload] clearBaselineKey called");
    try {
      // 使用 store 的方法清空 baseline key
      const exportStore = useExportStore();
      console.log("[useLokaliseUpload] Clearing baseline key...");
      await exportStore.saveExcelBaselineKey("");
      console.log("[useLokaliseUpload] Baseline key cleared successfully");

      // 触发事件通知其他组件baseline key已被清空
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("baselineKeyCleared"));
      }
    } catch (error) {
      console.error("[useLokaliseUpload] Failed to clear baseline key:", error);
    }
  };

  /**
   * 更新baseline key为下一个可用值
   * @param {Array} translationResult - 翻译结果数组
   */
  const updateBaselineKey = async (translationResult) => {
    console.log("[useLokaliseUpload] updateBaselineKey called", {
      translationResult,
      translationResultLength: translationResult?.length,
      translationResultType: typeof translationResult,
      isArray: Array.isArray(translationResult),
    });

    try {
      const exportStore = useExportStore();
      const nextBaselineKey = calculateNextBaselineKey(translationResult);

      console.log("[useLokaliseUpload] Calculating next baseline key:", {
        translationResultLength: translationResult?.length,
        nextBaselineKey,
        currentBaselineKey:
          exportStore.excelBaselineKey ||
          localStorage.getItem("excel_baseline_key"),
      });

      if (nextBaselineKey) {
        // 更新 baseline key
        const success = await exportStore.saveExcelBaselineKey(nextBaselineKey);

        if (success) {
          console.log(
            "[useLokaliseUpload] Baseline key updated successfully:",
            nextBaselineKey
          );

          // 触发事件通知其他组件baseline key已更新
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("baselineKeyUpdated", {
                detail: { newBaselineKey: nextBaselineKey },
              })
            );
          }
        } else {
          console.warn(
            "[useLokaliseUpload] Failed to save baseline key, it may already exist in the project:",
            nextBaselineKey
          );
          // 如果保存失败（可能是 key 已存在），尝试递增到下一个可用的 key
          const parsed = parseKey(nextBaselineKey);
          if (parsed) {
            let attemptNumber = parsed.number + 1;
            let attemptKey = `${parsed.prefix}${attemptNumber}`;
            let maxAttempts = 10; // 最多尝试 10 次

            while (maxAttempts > 0) {
              const attemptSuccess = await exportStore.saveExcelBaselineKey(
                attemptKey
              );
              if (attemptSuccess) {
                console.log(
                  "[useLokaliseUpload] Baseline key updated to alternative:",
                  attemptKey
                );
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("baselineKeyUpdated", {
                      detail: { newBaselineKey: attemptKey },
                    })
                  );
                }
                return;
              }
              attemptNumber++;
              attemptKey = `${parsed.prefix}${attemptNumber}`;
              maxAttempts--;
            }
          }
          // 如果所有尝试都失败，保持当前 baseline key 不变
          console.warn(
            "[useLokaliseUpload] Could not update baseline key, keeping current value"
          );
        }
      } else {
        console.log(
          "[useLokaliseUpload] Cannot calculate next baseline key, clearing it"
        );
        // 如果无法计算下一个值，则清空
        await clearBaselineKey();
      }
    } catch (error) {
      console.error(
        "[useLokaliseUpload] Failed to update baseline key:",
        error
      );
      // 如果更新失败，尝试清空
      await clearBaselineKey();
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

    // 过滤掉完全空白的行（所有字段都为空）
    const filteredResult = translationResult.filter((row) => {
      if (!row || typeof row !== "object") return false;
      // 检查是否有任何非空字段
      return Object.values(row).some(
        (value) => value && String(value).trim() !== ""
      );
    });

    if (filteredResult.length === 0) {
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
      // 如果没有key值则使用en作为key
      const keys = filteredResult.map((row) => {
        // 如果没有key值则使用en作为key
        const keyName =
          row.key && row.key.trim() ? row.key.trim() : row.en || "";

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

      // 在上传前检查Key是否重复（强制校验）
      const keyNames = keys.map((key) => key.key_name);
      try {
        const searchResult = await searchKeysByNames(
          uploadStore.uploadForm.projectId,
          keyNames
        );

        // 构建已存在的 key_name 集合
        const existingKeyNames = new Set();
        if (searchResult.success && Array.isArray(searchResult.results)) {
          searchResult.results.forEach((result) => {
            if (result.key_name) {
              existingKeyNames.add(result.key_name);
            }
          });
        }

        // 检查是否有重复的Key
        const duplicateKeys = keyNames.filter((keyName) =>
          existingKeyNames.has(keyName)
        );

        if (duplicateKeys.length > 0) {
          throw new Error(
            `The following keys already exist in the project and cannot be uploaded: ${duplicateKeys.join(
              ", "
            )}`
          );
        }
      } catch (error) {
        // 如果是我们主动抛出的重复Key错误，直接抛出
        if (error.message.includes("already exist")) {
          throw error;
        }
        // 如果是API调用失败，记录警告但继续上传（让Lokalise API处理）
        console.warn("Failed to check duplicate keys before upload:", error);
        ElMessage.warning(
          "Warning: Could not verify duplicate keys. Upload will proceed, but may fail if keys already exist."
        );
      }

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

      // 上传完成后更新baseline key为下一个可用值
      console.log(
        "[useLokaliseUpload] Upload successful, updating baseline key...",
        {
          filteredResultLength: filteredResult?.length,
          filteredResult,
        }
      );
      await updateBaselineKey(filteredResult);
      console.log("[useLokaliseUpload] Baseline key update completed");
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
