import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useI18n } from "../composables/Core/useI18n.js";
import {
  fetchCurrentUserTerms,
  addUserTerms,
  deleteUserTerm,
  deleteTermIndex,
  fetchUserTermsStatus,
  rebuildUserEmbedding,
  fetchUserEmbeddingStatus,
  updateIndex,
} from "../requests/terms.js";

/**
 * 术语管理状态
 * 管理术语数据、嵌入状态、加载状态等
 */
export const useTermsStore = defineStore("terms", {
  state: () => ({
    // 术语数据
    termsData: [],

    // 术语状态
    termsStatus: false,
    termsTitle: "Terms Library",

    // 统计信息
    totalTerms: 0,

    // 加载状态
    termsLoading: false,
    refreshLoading: false,
    rebuildLoading: false,

    // 错误状态
    termsError: null,

    // 嵌入相关状态
    embeddingStatus: "pending", // pending, building, completed, failed
    lastEmbeddingTime: "",

    // 编辑状态
    editableTermsData: [],
    hasChanges: false,
  }),

  getters: {
    // 检查是否有术语数据
    hasTermsData: (state) => state.termsData.length > 0,

    // 检查是否正在加载
    isLoading: (state) =>
      state.termsLoading || state.refreshLoading || state.rebuildLoading,

    // 检查嵌入是否完成
    isEmbeddingCompleted: (state) => state.embeddingStatus === "completed",

    // 检查嵌入是否失败
    isEmbeddingFailed: (state) => state.embeddingStatus === "failed",

    // 检查嵌入是否正在构建
    isEmbeddingBuilding: (state) => state.embeddingStatus === "building",

    // 获取嵌入状态文本
    embeddingStatusText: (state) => {
      const statusMap = {
        pending: "Pending",
        building: "Building...",
        completed: "Completed",
        failed: "Failed",
      };
      return statusMap[state.embeddingStatus] || "Unknown";
    },

    // 检查是否有未保存的更改
    hasUnsavedChanges: (state) => state.hasChanges,

    // 获取过滤后的术语数据
    filteredTermsData:
      (state) =>
      (filter = "") => {
        if (!filter.trim()) {
          return state.termsData;
        }

        const searchTerm = filter.toLowerCase().trim();
        return state.termsData.filter((term) => {
          return (
            term.en?.toLowerCase().includes(searchTerm) ||
            term.cn?.toLowerCase().includes(searchTerm) ||
            term.jp?.toLowerCase().includes(searchTerm)
          );
        });
      },
  },

  actions: {
    /**
     * 设置术语数据
     * @param {Array} data - 术语数据
     */
    setTermsData(data) {
      this.termsData = data || [];
      this.totalTerms = this.termsData.length;

      // 同步到可编辑数据
      this.editableTermsData = JSON.parse(JSON.stringify(this.termsData));
      this.hasChanges = false;
    },

    /**
     * 添加术语
     * @param {Object|Array} terms - 术语或术语数组
     */
    addTerms(terms) {
      const termsArray = Array.isArray(terms) ? terms : [terms];
      this.termsData.push(...termsArray);
      this.totalTerms = this.termsData.length;

      // 同步到可编辑数据
      this.editableTermsData = JSON.parse(JSON.stringify(this.termsData));
    },

    /**
     * 删除术语
     * @param {number} index - 索引
     */
    removeTerm(index) {
      if (index >= 0 && index < this.termsData.length) {
        this.termsData.splice(index, 1);
        this.totalTerms = this.termsData.length;

        // 同步到可编辑数据
        this.editableTermsData = JSON.parse(JSON.stringify(this.termsData));
      }
    },

    /**
     * 更新术语
     * @param {number} index - 索引
     * @param {Object} term - 更新后的术语
     */
    updateTerm(index, term) {
      if (index >= 0 && index < this.termsData.length) {
        this.termsData[index] = { ...this.termsData[index], ...term };

        // 同步到可编辑数据
        this.editableTermsData = JSON.parse(JSON.stringify(this.termsData));
      }
    },

    /**
     * 设置术语状态
     * @param {boolean} status - 状态
     */
    setTermsStatus(status) {
      this.termsStatus = status;
    },

    /**
     * 设置术语标题
     * @param {string} title - 标题
     */
    setTermsTitle(title) {
      this.termsTitle = title;
    },

    /**
     * 设置加载状态
     * @param {string} type - 加载类型 (terms, refresh, rebuild)
     * @param {boolean} loading - 加载状态
     */
    setLoading(type, loading) {
      switch (type) {
        case "terms":
          this.termsLoading = loading;
          break;
        case "refresh":
          this.refreshLoading = loading;
          break;
        case "rebuild":
          this.rebuildLoading = loading;
          break;
      }
    },

    /**
     * 设置错误状态
     * @param {string|null} error - 错误信息
     */
    setError(error) {
      this.termsError = error;
    },

    /**
     * 设置嵌入状态
     * @param {string} status - 嵌入状态
     */
    setEmbeddingStatus(status) {
      this.embeddingStatus = status;
    },

    /**
     * 设置最后嵌入时间
     * @param {string} time - 时间字符串
     */
    setLastEmbeddingTime(time) {
      this.lastEmbeddingTime = time;
    },

    /**
     * 开始嵌入构建
     */
    startEmbeddingBuild() {
      this.embeddingStatus = "building";
      this.setLoading("rebuild", true);
    },

    /**
     * 完成嵌入构建
     * @param {string} time - 完成时间
     */
    completeEmbeddingBuild(time) {
      this.embeddingStatus = "completed";
      this.lastEmbeddingTime = time;
      this.setLoading("rebuild", false);
    },

    /**
     * 嵌入构建失败
     * @param {string} error - 错误信息
     */
    failEmbeddingBuild(error) {
      this.embeddingStatus = "failed";
      this.setError(error);
      this.setLoading("rebuild", false);
    },

    /**
     * 从API获取terms状态信息
     */
    async fetchTermsStatus() {
      this.setError(null);

      try {
        const statusData = await fetchUserTermsStatus();
        this.totalTerms = statusData.total_terms || 0;
      } catch (err) {
        this.setError(err.message);
        console.error("Failed to fetch terms status:", err);
      }
    },

    /**
     * 从API获取terms数据
     */
    async fetchTermsData() {
      if (this.termsLoading) return; // 防止重复请求

      this.setLoading("terms", true);
      this.setError(null);

      try {
        const data = await fetchCurrentUserTerms();
        this.setTermsData(data.terms || []);
      } catch (err) {
        this.setError(err.message);
        console.error("Failed to fetch terms:", err);
        ElMessage.error("Failed to fetch terms data");
      } finally {
        this.setLoading("terms", false);
      }
    },

    /**
     * 获取嵌入状态
     */
    async fetchEmbeddingStatus() {
      try {
        const statusData = await fetchUserEmbeddingStatus();
        this.embeddingStatus = statusData.embedding_status || "pending";
        this.lastEmbeddingTime = statusData.last_embedding_time || "";
      } catch (err) {
        console.error("Failed to fetch embedding status:", err);
      }
    },

    /**
     * 刷新术语数据
     * @param {boolean} showSuccessMessage - 是否显示成功消息
     */
    async refreshTerms(showSuccessMessage = true) {
      this.setLoading("refresh", true);
      this.setError(null);

      try {
        // 只获取状态信息，不获取terms数据
        const results = await Promise.allSettled([
          this.fetchTermsStatus(),
          this.fetchEmbeddingStatus(),
        ]);

        // 检查是否有成功的请求
        const hasSuccess = results.some(
          (result) => result.status === "fulfilled"
        );

        if (hasSuccess && showSuccessMessage) {
          ElMessage.success("Terms refreshed successfully");
        }
      } catch (error) {
        console.error("Failed to refresh terms:", error);
        this.setError("Failed to refresh terms");
        ElMessage.error("Failed to refresh terms");
      } finally {
        this.setLoading("refresh", false);
      }
    },

    /**
     * 重建嵌入
     */
    async rebuildEmbedding() {
      this.startEmbeddingBuild();

      try {
        await rebuildUserEmbedding();
        const currentTime = new Date().toLocaleString();
        this.completeEmbeddingBuild(currentTime);
        ElMessage.success("Embedding rebuilt successfully");
      } catch (error) {
        console.error("Failed to rebuild embedding:", error);
        this.failEmbeddingBuild("Failed to rebuild embedding");
        ElMessage.error("Failed to rebuild embedding");
      }
    },

    /**
     * 添加术语
     * @param {Array} terms - 术语数组
     */
    async addTerms(terms) {
      try {
        await addUserTerms(terms);
        // 刷新数据
        await this.refreshTerms(false);
        ElMessage.success(`Added ${terms.length} terms successfully`);
      } catch (error) {
        console.error("Failed to add terms:", error);
        ElMessage.error("Failed to add terms");
        throw error;
      }
    },

    /**
     * 删除术语
     * @param {string} termId - 术语ID
     */
    async deleteTerm(termId) {
      try {
        await deleteUserTerm(termId);
        // 刷新数据
        await this.refreshTerms(false);
        ElMessage.success("Term deleted successfully");
      } catch (error) {
        console.error("Failed to delete term:", error);
        ElMessage.error("Failed to delete term");
        throw error;
      }
    },

    /**
     * 删除术语索引
     * @param {number} index - 索引
     */
    async deleteTermIndex(index) {
      try {
        await deleteTermIndex(index);
        // 刷新数据
        await this.refreshTerms(false);
        ElMessage.success("Term deleted successfully");
      } catch (error) {
        console.error("Failed to delete term:", error);
        ElMessage.error("Failed to delete term");
        throw error;
      }
    },

    /**
     * 更新术语状态
     * @param {boolean} status - 状态
     */
    updateTermStatus(status) {
      this.termsStatus = status;
      // 保存到存储
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("ad_terms_status", status.toString());
      }
    },

    /**
     * 初始化术语状态
     */
    initializeTermsStatus() {
      if (typeof window !== "undefined" && window.localStorage) {
        const savedStatus = localStorage.getItem("ad_terms_status");
        this.termsStatus = savedStatus !== null ? savedStatus === "true" : true;
      }
    },

    /**
     * 更新可编辑数据
     * @param {Array} data - 可编辑数据
     */
    updateEditableTermsData(data) {
      this.editableTermsData = data || [];
      this.checkForChanges();
    },

    /**
     * 检查是否有更改
     */
    checkForChanges() {
      this.hasChanges =
        JSON.stringify(this.editableTermsData) !==
        JSON.stringify(this.termsData);
    },

    /**
     * 获取更改的术语
     * @returns {Array} 更改的术语数组
     */
    getChangedTerms() {
      if (!this.hasChanges) return [];

      const changedTerms = [];
      const minLength = Math.min(
        this.editableTermsData.length,
        this.termsData.length
      );

      // 检查修改的术语
      for (let i = 0; i < minLength; i++) {
        const editable = this.editableTermsData[i];
        const original = this.termsData[i];

        if (JSON.stringify(editable) !== JSON.stringify(original)) {
          changedTerms.push(editable);
        }
      }

      // 检查新增的术语
      if (this.editableTermsData.length > this.termsData.length) {
        changedTerms.push(
          ...this.editableTermsData.slice(this.termsData.length)
        );
      }

      return changedTerms;
    },

    /**
     * 保存更改
     */
    async saveChanges() {
      if (!this.hasChanges) {
        ElMessage.warning("No changes to save");
        return;
      }

      const changedTerms = this.getChangedTerms();
      if (changedTerms.length === 0) {
        ElMessage.warning("No changes to save");
        return;
      }

      try {
        // 这里应该调用实际的API来保存更改
        // 直接更新本地数据
        this.setTermsData(this.editableTermsData);

        ElMessage.success(`Saved ${changedTerms.length} term changes`);
      } catch (error) {
        console.error("Failed to save changes:", error);
        ElMessage.error("Failed to save changes");
      }
    },

    /**
     * 重置可编辑数据
     */
    resetEditableData() {
      this.editableTermsData = JSON.parse(JSON.stringify(this.termsData));
      this.hasChanges = false;
    },

    /**
     * 重新初始化状态
     */
    reinitializeStatus() {
      this.termsStatus = false;
      this.termsError = null;
      this.embeddingStatus = "pending";
      this.lastEmbeddingTime = "";
    },

    /**
     * 重置所有状态
     */
    resetAll() {
      this.termsData = [];
      this.termsStatus = false;
      this.termsTitle = "Terms Library";
      this.totalTerms = 0;
      this.termsLoading = false;
      this.refreshLoading = false;
      this.rebuildLoading = false;
      this.termsError = null;
      this.embeddingStatus = "pending";
      this.lastEmbeddingTime = "";
      this.editableTermsData = [];
      this.hasChanges = false;
    },
  },

  // 启用持久化存储
  persist: {
    key: "terms-store",
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
    // 只持久化部分状态
    paths: [
      "termsData",
      "termsStatus",
      "embeddingStatus",
      "lastEmbeddingTime",
      "totalTerms",
    ],
  },
});
