import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useDeduplicate } from "../../composables/Translation/useDeduplicate.js";

/**
 * 去重功能状态管理
 * 管理去重对话框、项目选择、去重状态等
 */
export const useDeduplicateStore = defineStore("deduplicate", {
  state: () => ({
    // 去重相关状态
    deduplicateDialogVisible: false,
    selectedProject: "AmazonSearch",
    isDeduplicating: false,
    isAutoDeduplicate: false, // 标记是否为自动去重
  }),

  getters: {
    // 检查是否正在去重
    isDeduplicating: (state) => state.isDeduplicating,
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
     * 处理去重操作（手动）
     */
    handleDeduplicate() {
      this.setAutoDeduplicate(false);
      this.openDeduplicateDialog();
    },

    /**
     * 处理自动去重对话框显示
     */
    handleShowAutoDeduplicateDialog() {
      this.setAutoDeduplicate(true);
      this.openDeduplicateDialog();
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
      if (!this.selectedProject) {
        ElMessage.warning("Please select a project");
        return { success: false, error: "No project selected" };
      }

      this.setDeduplicating(true);

      try {
        const deduplicate = useDeduplicate();
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
            // 关闭去重对话框
            this.closeDeduplicateDialog();
            // 继续翻译
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

          // 如果是自动去重，关闭对话框
          if (this.isAutoDeduplicate) {
            this.closeDeduplicateDialog();
          }

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
     * 从localStorage加载设置
     */
    initializeDeduplicateSettings() {
      try {
        // 从 localStorage 获取去重项目设置
        const deduplicateProject = localStorage.getItem(
          "deduplicate_project_selection"
        );
        if (deduplicateProject) {
          this.selectedProject = deduplicateProject;
        }
      } catch (error) {
        console.error("Failed to initialize deduplicate settings:", error);
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
