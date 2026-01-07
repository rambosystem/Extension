import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useDeduplicate } from "../../composables/Translation/useDeduplicate.js";
import { useTranslationSettingsStore } from "../settings/translation.js";
import { useExportStore } from "./export.js";
import { useTranslationCoreStore } from "./core.js";
import { debugLog, debugError } from "../../utils/debug.js";

/**
 * 去重功能状态管理
 * 管理去重对话框、项目选择、去重状态等
 */
export const useDeduplicateStore = defineStore("deduplicate", {
  state: () => ({
    // 去重相关状态
    deduplicateDialogVisible: false,
    selectedProject: null, // 使用全局 Default Project 的名称
    isDeduplicating: false,
    isAutoDeduplicate: false, // 标记是否为自动去重
  }),

  getters: {
    // 检查是否正在去重
    isProcessing: (state) => state.isDeduplicating,
  },

  actions: {
    /**
     * 设置去重对话框可见性
     * @param {boolean} visible - 是否可见
     */
    setDeduplicateDialogVisible(visible) {
      this.deduplicateDialogVisible = visible;
    },

    /**
     * 打开去重对话框
     */
    openDeduplicateDialog() {
      this.deduplicateDialogVisible = true;
    },

    /**
     * 关闭去重对话框
     */
    closeDeduplicateDialog() {
      this.deduplicateDialogVisible = false;
      this.isDeduplicating = false;
      this.isAutoDeduplicate = false; // 重置自动去重标志
    },

    /**
     * 设置选中的去重项目
     * @param {string} project - 项目名称
     */
    setSelectedProject(project) {
      this.selectedProject = project;
    },

    /**
     * 设置自动去重标志
     * @param {boolean} isAuto - 是否为自动去重
     */
    setAutoDeduplicate(isAuto) {
      this.isAutoDeduplicate = isAuto;
    },

    /**
     * 处理去重操作（手动）- 直接执行，不需要对话框
     * @param {string} codeContent - 待去重的代码内容
     * @param {Function} continueTranslation - 继续翻译的回调函数
     * @param {Function} clearCache - 清空缓存的回调函数
     */
    async handleDeduplicate(codeContent, continueTranslation, clearCache) {
      this.setAutoDeduplicate(false);
      // 初始化去重设置，确保使用 Default Project
      this.initializeDeduplicateSettings();
      // 直接执行去重
      return await this.executeDeduplicate(
        codeContent,
        continueTranslation,
        clearCache
      );
    },

    /**
     * 处理自动去重 - 直接执行，不需要对话框
     * @param {string} codeContent - 待去重的代码内容
     * @param {Function} continueTranslation - 继续翻译的回调函数
     * @param {Function} clearCache - 清空缓存的回调函数
     */
    async handleShowAutoDeduplicateDialog(
      codeContent,
      continueTranslation,
      clearCache
    ) {
      this.setAutoDeduplicate(true);

      // 初始化去重设置，确保使用 Default Project
      this.initializeDeduplicateSettings();

      // 直接执行去重
      return await this.executeDeduplicate(
        codeContent,
        continueTranslation,
        clearCache
      );
    },

    /**
     * 设置去重状态
     * @param {boolean} deduplicating - 是否正在去重
     */
    setDeduplicating(deduplicating) {
      this.isDeduplicating = deduplicating;
    },

    /**
     * 执行去重操作
     * @param {string} codeContent - 待去重的代码内容
     * @param {Function} continueTranslation - 继续翻译的回调函数
     * @param {Function} clearCache - 清空缓存的回调函数
     * @returns {Promise<Object>} 去重结果
     */
    async executeDeduplicate(codeContent, continueTranslation, clearCache) {
      // 根据Default Project判断CDN项目名称
      const exportStore = useExportStore();
      const defaultProjectId = exportStore.defaultProjectId;

      let cdnProjectName = null;

      // 优先使用Default Project来判断CDN地址
      if (defaultProjectId) {
        cdnProjectName = this.getCdnProjectName(defaultProjectId, null);
      }

      // 如果无法从Default Project判断，则使用设置中的去重项目名称
      if (!cdnProjectName) {
        const translationSettingsStore = useTranslationSettingsStore();
        const deduplicateProject = translationSettingsStore.deduplicateProject;
        if (deduplicateProject) {
          cdnProjectName = this.getCdnProjectName(null, deduplicateProject);
        }
      }

      if (!cdnProjectName) {
        ElMessage.warning(
          "Please configure Default Project or deduplicate project in Settings first"
        );
        return { success: false, error: "No CDN project configured" };
      }

      debugLog(
        "[DeduplicateStore] Executing deduplicate with CDN project:",
        cdnProjectName,
        "from default project ID:",
        defaultProjectId
      );
      this.setDeduplicating(true);

      try {
        const deduplicate = useDeduplicate();
        // 使用CDN项目名称（根据Project判断）
        const result = await deduplicate.deduplicateTranslation(
          cdnProjectName,
          codeContent
        );

        // 无论是否有剩余文本，都要更新文本框内容
        const remainingTexts = Array.isArray(result.remainingTexts)
          ? result.remainingTexts.join("\n")
          : "";

        if (result.remainingCount > 0) {
          ElMessage.success(
            `Deduplication completed: ${result.duplicateCount} duplicates removed, ${result.remainingCount} texts remaining`
          );

          // 如果是自动去重，先更新 codeContent，然后继续翻译流程
          if (this.isAutoDeduplicate) {
            // 先更新 translationCoreStore 的 codeContent 为去重后的文本
            const translationCoreStore = useTranslationCoreStore();
            translationCoreStore.setCodeContent(remainingTexts);
            debugLog(
              "[DeduplicateStore] Updated codeContent with deduplicated texts:",
              remainingTexts
            );

            // 继续翻译（使用更新后的去重文本）
            if (continueTranslation) {
              await continueTranslation();
            }
          }

          return { success: true, remainingTexts };
        } else {
          // 如果所有文本都被去重了，清空缓存
          if (clearCache) {
            clearCache();
          }
          ElMessage.info("All texts were duplicated and removed");

          // 如果是自动去重，不需要关闭对话框（因为已经没有对话框了）

          return { success: true, remainingTexts: "" };
        }
      } catch (error) {
        console.error("Deduplication failed:", error);
        ElMessage.error("Deduplication failed");
        return { success: false, error };
      } finally {
        this.setDeduplicating(false);
      }
    },

    /**
     * 根据项目ID或项目名称获取CDN项目名称
     * @param {string} projectId - 项目ID
     * @param {string} projectName - 项目名称
     * @returns {string|null} CDN项目名称 (Common, AmazonSearch, Commerce)
     */
    getCdnProjectName(projectId, projectName) {
      // 如果提供了项目名称，直接尝试匹配
      if (projectName) {
        const normalizedName = projectName.trim();
        // 检查是否是CDN支持的项目名称
        if (["Common", "AmazonSearch", "Commerce"].includes(normalizedName)) {
          return normalizedName;
        }
        // 尝试通过项目名称匹配（不区分大小写）
        const lowerName = normalizedName.toLowerCase();
        if (lowerName.includes("common")) return "Common";
        if (lowerName.includes("amazon") || lowerName.includes("search"))
          return "AmazonSearch";
        if (lowerName.includes("commerce")) return "Commerce";
      }

      // 如果提供了项目ID，尝试从项目列表中找到项目并获取名称
      if (projectId) {
        try {
          const projects = localStorage.getItem("lokalise_projects");
          if (projects) {
            const parsedProjects = JSON.parse(projects);
            if (Array.isArray(parsedProjects)) {
              const project = parsedProjects.find(
                (p) => p.project_id === projectId
              );
              if (project && project.name) {
                const normalizedName = project.name.trim();
                // 检查是否是CDN支持的项目名称
                if (
                  ["Common", "AmazonSearch", "Commerce"].includes(
                    normalizedName
                  )
                ) {
                  return normalizedName;
                }
                // 尝试通过项目名称匹配（不区分大小写）
                const lowerName = normalizedName.toLowerCase();
                if (lowerName.includes("common")) return "Common";
                if (
                  lowerName.includes("amazon") ||
                  lowerName.includes("search")
                )
                  return "AmazonSearch";
                if (lowerName.includes("commerce")) return "Commerce";
              }
            }
          }
        } catch (error) {
          debugError("[DeduplicateStore] Failed to get project name:", error);
        }
      }

      return null;
    },

    /**
     * 初始化去重设置
     * 根据Default Project判断CDN地址
     */
    initializeDeduplicateSettings() {
      try {
        debugLog("[DeduplicateStore] Initializing deduplicate settings...");
        const translationSettingsStore = useTranslationSettingsStore();
        const exportStore = useExportStore();

        // 确保设置已初始化
        translationSettingsStore.initializeTranslationSettings();

        // 优先使用Default Project来判断CDN地址
        const defaultProjectId = exportStore.defaultProjectId;
        let cdnProjectName = null;

        if (defaultProjectId) {
          // 根据Default Project获取项目信息并判断CDN项目名称
          cdnProjectName = this.getCdnProjectName(defaultProjectId, null);
          debugLog(
            "[DeduplicateStore] Got CDN project name from default project:",
            cdnProjectName
          );
        }

        // 如果无法从Default Project判断，则使用设置中的去重项目名称
        if (!cdnProjectName) {
          const deduplicateProject =
            translationSettingsStore.deduplicateProject;
          if (deduplicateProject) {
            cdnProjectName = this.getCdnProjectName(null, deduplicateProject);
            debugLog(
              "[DeduplicateStore] Using deduplicate project from settings:",
              deduplicateProject,
              "-> CDN project:",
              cdnProjectName
            );
          }
        }

        if (cdnProjectName) {
          this.selectedProject = cdnProjectName;
          debugLog(
            "[DeduplicateStore] Final CDN project name:",
            cdnProjectName
          );
        } else {
          debugLog("[DeduplicateStore] No CDN project name found");
        }
      } catch (error) {
        debugError(
          "[DeduplicateStore] Failed to initialize deduplicate settings:",
          error
        );
      }
    },

    /**
     * 根据项目ID获取项目名称
     * @param {string} projectId - 项目ID
     * @returns {string|null} 项目名称
     */
    getProjectNameById(projectId) {
      try {
        const projects = localStorage.getItem("lokalise_projects");
        if (projects) {
          const parsedProjects = JSON.parse(projects);
          if (Array.isArray(parsedProjects)) {
            const project = parsedProjects.find(
              (p) => p.project_id === projectId
            );
            if (project && project.name) {
              return project.name;
            }
          }
        }
        return null;
      } catch (error) {
        debugError(
          "[DeduplicateStore] Failed to get project name by ID:",
          error
        );
        return null;
      }
    },

    /**
     * 重置去重状态
     */
    resetDeduplicateState() {
      this.deduplicateDialogVisible = false;
      this.isDeduplicating = false;
      this.isAutoDeduplicate = false;
    },
  },

  // 启用持久化存储
  persist: {
    key: "deduplicate-store",
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
