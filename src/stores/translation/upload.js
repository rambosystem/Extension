import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import {
  getAvailableLanguages,
  getLanguageIso,
} from "../../config/languages.js";
import { uploadTranslationKeys } from "../../requests/lokalise.js";
import { searchKeysByNames } from "../../requests/deduplicate.js";
import { useExportStore } from "./export.js";
import { useTranslationCoreStore } from "./core.js";
import { debugLog, debugError } from "../../utils/debug.js";

/**
 * 上传功能状态管理
 * 管理上传对话框、表单状态、项目列表等
 */
export const useUploadStore = defineStore("upload", {
  state: () => ({
    // 上传相关状态
    uploadDialogVisible: false,
    uploadForm: {
      projectId: "",
      tag: "",
      description: "",
    },
    projectList: [],
    isUploading: false,
    isUploadSuccess: false,
    successMessage: "",
    currentProject: null,

    // 加载状态
    loadingStates: {
      upload: false,
    },
  }),

  getters: {
    // 检查是否正在加载
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 检查是否可以上传
    canUpload: (state) => !state.isUploading,
  },

  actions: {
    /**
     * 设置加载状态
     * @param {string} key - 加载状态键
     * @param {boolean} loading - 加载状态
     */
    setLoading(key, loading) {
      if (this.loadingStates.hasOwnProperty(key)) {
        this.loadingStates[key] = loading;
      }
    },

    /**
     * 设置上传对话框可见性
     * @param {boolean} visible - 是否可见
     */
    setUploadDialogVisible(visible) {
      this.uploadDialogVisible = visible;
    },

    /**
     * 打开上传对话框
     */
    openUploadDialog() {
      // 加载项目列表
      this.loadProjectList();

      // 自动设置默认Project
      this.setDefaultProject();

      this.uploadDialogVisible = true;
    },

    /**
     * 设置默认Project
     */
    setDefaultProject() {
      try {
        // 从exportStore获取默认Project ID
        const exportStore = useExportStore();
        const defaultProjectId =
          exportStore.defaultProjectId ||
          localStorage.getItem("default_project_id");

        if (defaultProjectId) {
          // 从项目列表中找到对应的项目
          const project = this.projectList.find(
            (p) => p.project_id === defaultProjectId
          );

          if (project) {
            this.setUploadProjectId(defaultProjectId);
            this.setCurrentProject(project);
          } else {
            // 如果项目不在列表中，尝试从localStorage加载项目列表
            const projects = localStorage.getItem("lokalise_projects");
            if (projects) {
              const parsedProjects = JSON.parse(projects);
              const foundProject = parsedProjects.find(
                (p) => p.project_id === defaultProjectId
              );
              if (foundProject) {
                this.setUploadProjectId(defaultProjectId);
                this.setCurrentProject(foundProject);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to set default project:", error);
      }
    },

    /**
     * 加载项目列表
     */
    loadProjectList() {
      try {
        const projects = localStorage.getItem("lokalise_projects");
        if (projects) {
          const parsedProjects = JSON.parse(projects);
          if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
            this.projectList = parsedProjects;
            // 如果有保存的项目ID，尝试恢复
            const savedProjectId = localStorage.getItem(
              "lokalise_upload_project_id"
            );
            if (savedProjectId) {
              this.setUploadProjectId(savedProjectId);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load project list:", error);
        this.projectList = [];
      }
    },

    /**
     * 关闭上传对话框
     */
    closeUploadDialog() {
      this.uploadDialogVisible = false;
      // 重置上传表单
      this.uploadForm = {
        projectId: "",
        tag: "",
        description: "",
      };
      this.isUploading = false;
      this.isUploadSuccess = false;
      this.successMessage = "";
    },

    /**
     * 设置上传状态
     * @param {boolean} uploading - 是否正在上传
     */
    setUploading(uploading) {
      this.isUploading = uploading;
      this.setLoading("upload", uploading);
    },

    /**
     * 设置上传成功状态
     * @param {boolean} success - 是否成功
     * @param {string} message - 成功消息
     */
    setUploadSuccess(success, message = "") {
      this.isUploadSuccess = success;
      this.successMessage = message;
    },

    /**
     * 设置项目列表
     * @param {Array} projects - 项目列表
     */
    setProjectList(projects) {
      this.projectList = projects || [];
    },

    /**
     * 设置当前项目
     * @param {Object} project - 当前项目
     */
    setCurrentProject(project) {
      this.currentProject = project;
    },

    /**
     * 设置上传项目ID
     * @param {string} projectId - 项目ID
     */
    setUploadProjectId(projectId) {
      this.uploadForm.projectId = projectId;
      localStorage.setItem("lokalise_upload_project_id", projectId);
    },

    /**
     * 设置上传标签
     * @param {string} tag - 标签
     */
    setUploadTag(tag) {
      this.uploadForm.tag = tag;
      localStorage.setItem("lokalise_upload_tag", tag);
    },

    /**
     * 检查翻译结果的语言配置是否与当前配置匹配
     * @param {Array} translationData - 翻译数据
     * @returns {boolean} 是否匹配
     */
    checkTranslationConfigMatch(translationData) {
      if (!translationData || translationData.length === 0) {
        return false;
      }

      // 从翻译数据中提取所有语言 key（排除 editing_ 开头的 key）
      const storedLanguageKeys = new Set();
      Object.keys(translationData[0]).forEach((key) => {
        if (!key.startsWith("editing_")) {
          storedLanguageKeys.add(key);
        }
      });

      // 获取当前配置的目标语言（从 exportStore 获取，响应式更新）
      try {
        const exportStore = useExportStore();
        const targetLanguages = exportStore.targetLanguages || [];

        // 构建当前配置应该有的语言 key（必需字段）
        const expectedLanguageKeys = new Set(["en"]);
        targetLanguages.forEach((lang) => {
          const key = lang.toLowerCase().replace(/\s+/g, "_");
          expectedLanguageKeys.add(key);
        });

        // 只检查所有期望的 key 是否都存在（允许数据中有额外的字段）
        // 这样即使数据包含已取消的语言字段，只要必需的字段都存在就可以
        for (const key of expectedLanguageKeys) {
          if (!storedLanguageKeys.has(key)) {
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error("Failed to parse target languages:", error);
        return false;
      }
    },

    /**
     * 上传翻译结果到Lokalise
     * @param {Array} translationResult - 翻译结果
     */
    uploadToLokalise(translationResult) {
      if (translationResult.length === 0) {
        ElMessage.warning("No translation data to upload");
        return;
      }

      // 检查翻译结果的语言配置是否与当前配置匹配
      if (!this.checkTranslationConfigMatch(translationResult)) {
        ElMessage.warning(
          "The translation data does not match the current language configuration. Please translate again."
        );
        return;
      }

      // 直接打开上传对话框，不调用composable
      this.openUploadDialog();
    },

    /**
     * 执行上传操作
     * @param {Array} translationResult - 翻译结果
     */
    async executeUpload(translationResult) {
      if (translationResult.length === 0) {
        ElMessage.warning("No translation data to upload");
        return;
      }

      // 检查翻译结果的语言配置是否与当前配置匹配
      if (!this.checkTranslationConfigMatch(translationResult)) {
        ElMessage.warning(
          "The translation data does not match the current language configuration. Please translate again."
        );
        return;
      }

      this.setUploading(true);

      try {
        // 直接调用上传API，不依赖composable
        await this.performUpload(translationResult);

        this.setUploadSuccess(true, "Upload completed successfully");

        // 上传成功后更新baseline key
        await this.updateBaselineKeyAfterUpload(translationResult);
      } catch (error) {
        console.error("Upload failed:", error);

        // 显示详细的错误信息
        const errorMessage =
          error?.message || error?.toString() || "Upload failed";
        ElMessage.error({
          message: errorMessage,
          duration: 5000, // 显示5秒后自动消失
        });
      } finally {
        this.setUploading(false);
      }
    },

    /**
     * 执行实际的上传操作
     * @param {Array} translationResult - 翻译结果
     */
    async performUpload(translationResult) {
      // 获取API token
      const apiToken = localStorage.getItem("lokalise_api_token");
      if (!apiToken) {
        throw new Error("Lokalise API token not configured");
      }

      // 获取默认项目（从exportStore获取）
      const exportStore = useExportStore();
      const defaultProjectId =
        exportStore.defaultProjectId ||
        localStorage.getItem("default_project_id");

      if (!defaultProjectId) {
        throw new Error(
          "No default project configured. Please set a default project in Translation Settings."
        );
      }

      // 从项目列表中找到对应的项目
      let selectedProject = this.currentProject;
      if (!selectedProject || selectedProject.project_id !== defaultProjectId) {
        // 如果当前项目不匹配，从列表或localStorage中查找
        selectedProject = this.projectList.find(
          (p) => p.project_id === defaultProjectId
        );

        if (!selectedProject) {
          // 尝试从localStorage加载
          const projects = localStorage.getItem("lokalise_projects");
          if (projects) {
            const parsedProjects = JSON.parse(projects);
            selectedProject = parsedProjects.find(
              (p) => p.project_id === defaultProjectId
            );
          }
        }

        if (selectedProject) {
          this.setCurrentProject(selectedProject);
        } else {
          throw new Error(
            `Default project (${defaultProjectId}) not found in project list.`
          );
        }
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

      // 准备上传数据
      // 如果没有key值则使用en作为key
      const keys = translationResult.map((item) => {
        // 如果没有key值则使用en作为key
        const keyName =
          item.key && item.key.trim() ? item.key.trim() : item.en || "";

        // 构建translations数组：先添加英文，然后按顺序添加目标语言
        const translations = [
          {
            language_iso: "en",
            translation: item.en,
          },
        ];

        // 添加目标语言的翻译
        sortedLanguages.forEach((lang) => {
          const prop = lang.code.toLowerCase().replace(/\s+/g, "_");
          if (item[prop]) {
            translations.push({
              language_iso: lang.iso,
              translation: item[prop],
            });
          }
        });

        return {
          key_name: keyName,
          platforms: ["web", "other"],
          translations: translations,
          tags: this.uploadForm.tag ? [this.uploadForm.tag] : [],
        };
      });

      // 在上传前检查Key是否重复（强制校验）
      const keyNames = keys.map((key) => key.key_name);
      try {
        const searchResult = await searchKeysByNames(
          selectedProject.project_id,
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
          // 只清空重复key的key字段，保留整条翻译记录
          const translationCoreStore = useTranslationCoreStore();
          const updatedResult = translationResult.map((item) => {
            const keyName =
              item.key && item.key.trim() ? item.key.trim() : item.en || "";
            // 如果key已存在，清空key字段但保留其他翻译内容
            if (existingKeyNames.has(keyName)) {
              return {
                ...item,
                key: "", // 只清空key字段
              };
            }
            return item;
          });

          // 更新store中的翻译结果
          translationCoreStore.setTranslationResult(updatedResult);

          // 同步更新localStorage中的last_translation，确保下次加载时显示清空后的key
          translationCoreStore.saveTranslationToLocal(updatedResult);

          // 显示错误消息（只显示一次）
          const errorMessage = `The following ${
            duplicateKeys.length
          } key(s) already exist in the project. Their key values have been cleared from translation results: ${duplicateKeys.join(
            ", "
          )}`;
          throw new Error(errorMessage);
        }
      } catch (error) {
        // 如果是我们主动抛出的重复Key错误，直接抛出
        if (error.message.includes("already exist")) {
          throw error;
        }
        // 如果是API调用失败，记录警告但继续上传（让Lokalise API处理）
        console.warn("Failed to check duplicate keys before upload:", error);
      }

      // 执行上传
      await uploadTranslationKeys(
        selectedProject.project_id,
        keys,
        this.uploadForm.tag ? [this.uploadForm.tag] : [],
        apiToken
      );
    },

    /**
     * 解析 key 格式（如 "key1", "item5"）
     * @param {string} key - key 字符串
     * @returns {Object|null} { prefix: string, number: number } 或 null
     */
    parseKey(key) {
      if (!key || typeof key !== "string") return null;
      const match = key.trim().match(/^([a-zA-Z]+)(\d+)$/);
      if (!match) return null;
      return {
        prefix: match[1],
        number: parseInt(match[2], 10),
      };
    },

    /**
     * 计算下一个 baseline key
     * 基于 translationResult 中使用的最大 key 值
     * @param {Array} translationResult - 翻译结果数组
     * @returns {string|null} 下一个 baseline key，如果无法计算则返回 null
     */
    calculateNextBaselineKey(translationResult) {
      if (!translationResult || translationResult.length === 0) {
        debugLog(
          "[UploadStore] No translation result provided for baseline key calculation"
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
        debugLog(
          "[UploadStore] No current baseline key found, cannot calculate next"
        );
        return null;
      }

      // 解析当前的 baseline key
      const parsed = this.parseKey(currentBaselineKey.trim());
      if (!parsed) {
        debugError(
          "[UploadStore] Invalid baseline key format:",
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
          const keyParsed = this.parseKey(key.trim());
          if (
            keyParsed &&
            keyParsed.prefix.toLowerCase() === prefix.toLowerCase()
          ) {
            usedNumbers.add(keyParsed.number);
          }
        }
      });

      debugLog("[UploadStore] Baseline key calculation:", {
        currentBaselineKey,
        prefix,
        baselineNumber,
        usedNumbers: Array.from(usedNumbers),
        usedNumbersSize: usedNumbers.size,
      });

      // 如果没有找到已使用的 key，保持当前的 baseline key
      if (usedNumbers.size === 0) {
        debugLog(
          "[UploadStore] No matching keys found, keeping current baseline key"
        );
        return currentBaselineKey;
      }

      // 找出最大的已使用数字
      const maxUsedNumber = Math.max(...usedNumbers);

      // 下一个 baseline key 应该是 maxUsedNumber + 1
      // 但要确保不小于 baselineNumber（如果 baselineNumber 更大，使用它）
      const nextNumber = Math.max(maxUsedNumber + 1, baselineNumber);
      const nextBaselineKey = `${prefix}${nextNumber}`;

      // 验证生成的 key 格式是否正确（双重保险）
      if (!nextBaselineKey.match(/^[a-zA-Z]+[0-9]+$/)) {
        debugError(
          "[UploadStore] Generated baseline key format is invalid:",
          nextBaselineKey
        );
        return null;
      }

      debugLog("[UploadStore] Calculated next baseline key:", {
        maxUsedNumber,
        nextNumber,
        nextBaselineKey,
      });

      return nextBaselineKey;
    },

    /**
     * 上传成功后更新baseline key为下一个可用值
     * @param {Array} translationResult - 翻译结果数组
     */
    async updateBaselineKeyAfterUpload(translationResult) {
      debugLog("[UploadStore] updateBaselineKeyAfterUpload called", {
        translationResultLength: translationResult?.length,
      });

      try {
        const exportStore = useExportStore();
        const nextBaselineKey =
          this.calculateNextBaselineKey(translationResult);

        if (nextBaselineKey) {
          // 更新 baseline key（会进行格式和唯一性校验）
          const success = await exportStore.saveExcelBaselineKey(
            nextBaselineKey
          );

          if (success) {
            debugLog(
              "[UploadStore] Baseline key updated successfully:",
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
            debugLog(
              "[UploadStore] Failed to save baseline key (format or uniqueness check failed), clearing baseline key:",
              nextBaselineKey
            );
            // 如果保存失败（格式或唯一性校验失败），清空 baseline key
            await exportStore.saveExcelBaselineKey("");
          }
        } else {
          debugLog(
            "[UploadStore] Cannot calculate next baseline key, clearing baseline key"
          );
          // 如果无法计算下一个值，清空 baseline key
          await exportStore.saveExcelBaselineKey("");
        }
      } catch (error) {
        debugError("[UploadStore] Failed to update baseline key:", error);
        // 如果更新失败，不影响上传成功状态
      }
    },

    /**
     * 处理项目变化
     * @param {string} projectId - 项目ID
     */
    handleProjectChange(projectId) {
      this.uploadForm.projectId = projectId;
      // 找到对应的项目对象
      const project = this.projectList.find((p) => p.project_id === projectId);
      this.setCurrentProject(project);
    },

    /**
     * 处理标签变化
     * @param {string} tag - 标签
     */
    handleTagChange(tag) {
      this.setUploadTag(tag);
    },

    /**
     * 初始化上传设置
     * 从localStorage加载设置
     */
    initializeUploadSettings() {
      try {
        // 加载上传项目ID
        const projectId = localStorage.getItem("lokalise_upload_project_id");
        if (projectId) {
          this.uploadForm.projectId = projectId;
        }

        // 加载上传标签
        const tag = localStorage.getItem("lokalise_upload_tag");
        if (tag) {
          this.uploadForm.tag = tag;
        }
      } catch (error) {
        console.error("Failed to initialize upload settings:", error);
      }
    },

    /**
     * 重置上传状态
     */
    resetUploadState() {
      this.uploadDialogVisible = false;
      this.uploadForm = {
        projectId: "",
        tag: "",
        description: "",
      };
      this.isUploading = false;
      this.isUploadSuccess = false;
      this.successMessage = "";
      this.currentProject = null;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });
    },

    /**
     * 打开Lokalise项目页面
     */
    openLokaliseProject() {
      if (this.currentProject) {
        const projectUrl = `https://app.lokalise.com/project/${this.currentProject.project_id}/?view=multi`;
        window.open(projectUrl, "_blank");
      }
    },

    /**
     * 打开Lokalise下载页面
     */
    openLokaliseDownload() {
      if (this.currentProject) {
        const downloadUrl = `https://app.lokalise.com/download/${this.currentProject.project_id}/`;
        window.open(downloadUrl, "_blank");
      }
    },
  },

  // 启用持久化存储
  persist: {
    key: "upload-store",
    storage: {
      getItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem(key);
        }
      },
    },
  },
});
