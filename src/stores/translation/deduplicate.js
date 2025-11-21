import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useDeduplicate } from "../../composables/Translation/useDeduplicate.js";
import { useExportStore } from "./export.js";
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
      // 如果没有选中的项目，尝试使用 Default Project 的名称
      if (!this.selectedProject) {
        debugLog(
          "[DeduplicateStore] No selected project, trying to use default project"
        );
        const exportStore = useExportStore();
        const defaultProjectId = exportStore.defaultProjectId;
        if (defaultProjectId) {
          const projectName = this.getProjectNameById(defaultProjectId);
          if (projectName) {
            this.selectedProject = projectName;
            debugLog(
              "[DeduplicateStore] Using default project name:",
              projectName
            );
          }
        }
      }

      if (!this.selectedProject) {
        ElMessage.warning("Please select a project");
        return { success: false, error: "No project selected" };
      }

      debugLog(
        "[DeduplicateStore] Executing deduplicate with project:",
        this.selectedProject
      );
      this.setDeduplicating(true);

      try {
        const deduplicate = useDeduplicate();
        // selectedProject 是字符串（项目名称）
        const result = await deduplicate.deduplicateTranslation(
          this.selectedProject,
          codeContent
        );

        // 无论是否有剩余文本，都要更新文本框内容
        const remainingTexts = result.remainingTexts.join("\n");

        if (result.remainingCount > 0) {
          ElMessage.success(
            `Deduplication completed: ${result.duplicateCount} duplicates removed, ${result.remainingCount} texts remaining`
          );

          // 如果是自动去重，继续翻译流程
          if (this.isAutoDeduplicate) {
            // 继续翻译（不需要关闭对话框，因为已经没有对话框了）
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
     * 初始化去重设置
     * 使用全局 Default Project 的名称
     */
    initializeDeduplicateSettings() {
      try {
        debugLog("[DeduplicateStore] Initializing deduplicate settings...");
        const exportStore = useExportStore();

        // 获取默认项目ID
        const defaultProjectId = exportStore.defaultProjectId;
        if (defaultProjectId) {
          // 从项目列表中查找项目名称
          const projectName = this.getProjectNameById(defaultProjectId);
          if (projectName) {
            this.selectedProject = projectName;
            debugLog(
              "[DeduplicateStore] Using default project name:",
              projectName
            );
          } else {
            debugLog(
              "[DeduplicateStore] Default project ID found but name not found:",
              defaultProjectId
            );
            // 如果找不到项目名称，尝试从 localStorage 获取
            const deduplicateProject = localStorage.getItem(
              "deduplicate_project_selection"
            );
            if (deduplicateProject) {
              this.selectedProject = deduplicateProject;
            }
          }
        } else {
          debugLog(
            "[DeduplicateStore] No default project ID, using localStorage value"
          );
          // 如果没有默认项目，从 localStorage 获取
          const deduplicateProject = localStorage.getItem(
            "deduplicate_project_selection"
          );
          if (deduplicateProject) {
            this.selectedProject = deduplicateProject;
          }
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
