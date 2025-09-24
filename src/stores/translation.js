import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useI18n } from "../composables/Core/useI18n.js";
import { useTranslation } from "../composables/Translation/useTranslation.js";
import { useExcelExport } from "../composables/Excel/useExcelExport.js";
import { useLokaliseUpload } from "../composables/Upload/useLokaliseUpload.js";
import { useTranslationStorage } from "../composables/Translation/useTranslationStorage.js";
import { useTranslationCache } from "../composables/Translation/useTranslationCache.js";
import { useDeduplicate } from "../composables/Translation/useDeduplicate.js";

/**
 * 翻译功能状态管理
 * 管理翻译内容、结果、对话框状态等
 */
export const useTranslationStore = defineStore("translation", {
  state: () => ({
    // 翻译内容
    codeContent: "",

    // 翻译结果
    translationResult: [],

    // 对话框状态
    dialogVisible: false,

    // 翻译状态
    isTranslating: false,

    // 加载状态
    loadingStates: {
      translation: false,
      upload: false,
      export: false,
    },

    // 用户建议
    userSuggestion: "",
    userSuggestionVisible: false,

    // 表单引用
    formRef: null,
    formData: {},

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

    // 去重相关状态
    deduplicateDialogVisible: false,
    selectedProject: "AmazonSearch",
    isDeduplicating: false,

    // 缓存相关
    hasLastTranslation: false,
    lastTranslation: [],

    // Excel 导出设置
    excelBaselineKey: "",
    excelOverwrite: false,
  }),

  getters: {
    // 检查是否有翻译结果
    hasTranslationResult: (state) => state.translationResult.length > 0,

    // 检查是否有待翻译内容
    hasContent: (state) => !!state.codeContent?.trim(),

    // 检查是否正在加载
    isLoading: (state) =>
      Object.values(state.loadingStates).some((loading) => loading),

    // 获取翻译结果数量
    translationCount: (state) => state.translationResult.length,

    // 检查是否可以导出
    canExport: (state) =>
      state.translationResult.length > 0 && !state.isTranslating,

    // 检查是否可以上传
    canUpload: (state) =>
      state.translationResult.length > 0 && !state.isTranslating,
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
     * 设置翻译内容
     * @param {string} content - 翻译内容
     */
    setCodeContent(content) {
      this.codeContent = content || "";
    },

    /**
     * 清空翻译内容
     */
    clearCodeContent() {
      this.codeContent = "";
    },

    /**
     * 设置翻译结果
     * @param {Array} result - 翻译结果数组
     */
    setTranslationResult(result) {
      this.translationResult = result || [];
    },

    /**
     * 添加翻译结果
     * @param {Object} item - 翻译项
     */
    addTranslationResult(item) {
      this.translationResult.push(item);
    },

    /**
     * 删除翻译结果项
     * @param {number} index - 索引
     */
    removeTranslationResult(index) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult.splice(index, 1);
      }
    },

    /**
     * 更新翻译结果项
     * @param {number} index - 索引
     * @param {Object} item - 更新项
     */
    updateTranslationResult(index, item) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index] = {
          ...this.translationResult[index],
          ...item,
        };
      }
    },

    /**
     * 清空翻译结果
     */
    clearTranslationResult() {
      this.translationResult = [];
    },

    /**
     * 设置对话框可见性
     * @param {boolean} visible - 是否可见
     */
    setDialogVisible(visible) {
      this.dialogVisible = visible;
    },

    /**
     * 打开对话框
     */
    openDialog() {
      this.dialogVisible = true;
    },

    /**
     * 关闭对话框
     */
    closeDialog() {
      this.dialogVisible = false;
    },

    /**
     * 设置翻译状态
     * @param {boolean} translating - 是否正在翻译
     */
    setTranslating(translating) {
      this.isTranslating = translating;
    },

    /**
     * 开始翻译
     */
    startTranslation() {
      this.isTranslating = true;
      this.setLoading("translation", true);
    },

    /**
     * 完成翻译
     */
    finishTranslation() {
      this.isTranslating = false;
      this.setLoading("translation", false);
    },

    /**
     * 设置用户建议
     * @param {string} suggestion - 建议内容
     */
    setUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
    },

    /**
     * 显示用户建议
     * @param {string} suggestion - 建议内容
     */
    showUserSuggestion(suggestion) {
      this.userSuggestion = suggestion || "";
      this.userSuggestionVisible = true;
    },

    /**
     * 隐藏用户建议
     */
    hideUserSuggestion() {
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
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
      this.uploadDialogVisible = true;
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
    },

    /**
     * 设置选中的去重项目
     * @param {string} project - 项目名称
     */
    setSelectedProject(project) {
      this.selectedProject = project;
    },

    /**
     * 设置去重状态
     * @param {boolean} deduplicating - 是否正在去重
     */
    setDeduplicating(deduplicating) {
      this.isDeduplicating = deduplicating;
    },

    /**
     * 设置上次翻译结果
     * @param {Array} translation - 翻译结果
     */
    setLastTranslation(translation) {
      this.lastTranslation = translation || [];
      this.hasLastTranslation = translation && translation.length > 0;
    },

    /**
     * 清空上次翻译结果
     */
    clearLastTranslation() {
      this.lastTranslation = [];
      this.hasLastTranslation = false;
    },

    /**
     * 重置所有状态
     */
    resetAll() {
      this.codeContent = "";
      this.translationResult = [];
      this.dialogVisible = false;
      this.isTranslating = false;
      this.userSuggestion = "";
      this.userSuggestionVisible = false;
      this.uploadDialogVisible = false;
      this.deduplicateDialogVisible = false;
      this.isUploading = false;
      this.isUploadSuccess = false;
      this.isDeduplicating = false;

      // 重置加载状态
      Object.keys(this.loadingStates).forEach((key) => {
        this.loadingStates[key] = false;
      });

      // 重置表单
      this.uploadForm = {
        projectId: "",
        tag: "",
        description: "",
      };
    },

    /**
     * 保存翻译结果到本地存储
     * @param {Array} data - 翻译数据
     */
    saveTranslationToLocal(data) {
      try {
        const translationData = data.map((item) => ({
          en: item.en,
          cn: item.cn,
          jp: item.jp,
        }));

        localStorage.setItem(
          "last_translation",
          JSON.stringify(translationData)
        );
        this.setLastTranslation(translationData);
      } catch (error) {
        console.error("Failed to save translation to local storage:", error);
      }
    },

    /**
     * 从本地存储加载翻译结果
     */
    loadLastTranslation() {
      try {
        const stored = localStorage.getItem("last_translation");
        if (stored) {
          const translationData = JSON.parse(stored);
          this.setLastTranslation(translationData);
        }
      } catch (error) {
        console.error("Failed to load last translation from storage:", error);
      }
    },

    /**
     * 执行翻译并处理结果
     */
    async handleTranslate() {
      // 防重复请求检查
      if (this.isTranslating) {
        return;
      }

      // 检查 API Key 是否存在
      const apiKey = localStorage.getItem("deepseek_api_key");
      if (!apiKey) {
        ElMessage.warning("Please configure API Key first");
        return;
      }

      // 检查输入内容是否为空
      if (!this.codeContent?.trim()) {
        ElMessage.warning("Please enter content to translate");
        return;
      }

      // 检查是否启用了自动去重
      const autoDeduplicationEnabled =
        localStorage.getItem("auto_deduplication_enabled") === "true";

      if (autoDeduplicationEnabled) {
        // 触发自动去重对话框
        this.openDeduplicateDialog();
        return; // 等待用户选择项目后再继续翻译
      }

      // 正常翻译流程
      await this.continueTranslation();
    },

    /**
     * 继续翻译流程（在自动去重完成后调用）
     */
    async continueTranslation() {
      this.startTranslation();

      try {
        // 先弹出对话框，显示加载状态
        this.openDialog();

        // 使用翻译模块执行翻译
        const translation = useTranslation();
        const result = await translation.performTranslation(this.codeContent);

        // 直接设置到store的translationResult
        this.setTranslationResult(result);

        // 提取纯数据并保存到存储
        const translationData = translation.extractTranslationData(result);
        this.saveTranslationToLocal(translationData);
      } catch (error) {
        // 翻译失败时关闭对话框
        this.closeDialog();
        console.error("Translation failed:", error);
        ElMessage.error("Translation failed");
      } finally {
        this.finishTranslation();
      }
    },

    /**
     * 显示上次翻译结果
     */
    showLastTranslation() {
      if (this.hasLastTranslation) {
        // 为加载的数据添加编辑状态属性
        const storage = useTranslationStorage();
        const dataWithEditState = storage.addEditingStates(
          this.lastTranslation
        );

        // 直接设置到store的translationResult
        this.setTranslationResult(dataWithEditState);
        this.openDialog();
      } else {
        ElMessage.warning("No previous translation found");
      }
    },

    /**
     * 导出Excel文件
     */
    exportExcel() {
      if (this.translationResult.length === 0) {
        ElMessage.warning("No translation data to export");
        return;
      }

      const excelExport = useExcelExport();
      excelExport.exportExcel(this.translationResult);
    },

    /**
     * 保存Excel基线键
     * @param {string} key - 基线键
     */
    saveExcelBaselineKey(key) {
      if (!key?.trim()) {
        // 清空操作
        localStorage.setItem("excel_baseline_key", "");
        this.excelBaselineKey = "";
        return true;
      }

      // 验证格式：key+数字
      if (!key.match(/^[a-zA-Z]+[0-9]+$/)) {
        ElMessage.warning(
          "Excel baseline key format should be: letters + numbers (e.g., key123)"
        );
        return false;
      }

      localStorage.setItem("excel_baseline_key", key.trim());
      this.excelBaselineKey = key.trim();
      ElMessage.success("Excel baseline key saved successfully");
      return true;
    },

    /**
     * 更新Excel覆盖设置
     * @param {boolean} overwrite - 是否覆盖
     */
    updateExcelOverwrite(overwrite) {
      this.excelOverwrite = overwrite;
      localStorage.setItem("excel_overwrite", overwrite ? "true" : "false");
    },

    /**
     * 初始化翻译设置
     * 从localStorage加载设置
     */
    initializeTranslationSettings() {
      try {
        // 加载Excel基线键
        const excelBaselineKey = localStorage.getItem("excel_baseline_key");
        if (excelBaselineKey) {
          this.excelBaselineKey = excelBaselineKey;
        }

        // 加载Excel覆盖设置
        const excelOverwrite = localStorage.getItem("excel_overwrite");
        if (excelOverwrite !== null) {
          this.excelOverwrite = excelOverwrite === "true";
        }
      } catch (error) {
        console.error("Failed to initialize translation settings:", error);
      }
    },

    /**
     * 上传翻译结果到Lokalise
     */
    uploadToLokalise() {
      if (this.translationResult.length === 0) {
        ElMessage.warning("No translation data to upload");
        return;
      }

      const lokaliseUpload = useLokaliseUpload();
      lokaliseUpload.uploadToLokalise(this.translationResult);
    },

    /**
     * 进入编辑模式
     * @param {number} index - 索引
     * @param {string} field - 字段名
     */
    enterEditMode(index, field) {
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index][`editing_${field}`] = true;
      }
    },

    /**
     * 处理去重操作
     */
    async executeDeduplicate(project, remainingTexts) {
      this.setDeduplicating(true);

      try {
        const deduplicate = useDeduplicate();
        const result = await deduplicate.performDeduplication(
          this.codeContent,
          project
        );

        if (result && result.success) {
          this.codeContent = result.remainingTexts;
          ElMessage.success("Deduplication completed");
        }
      } catch (error) {
        console.error("Deduplication failed:", error);
        ElMessage.error("Deduplication failed");
      } finally {
        this.setDeduplicating(false);
        this.closeDeduplicateDialog();
      }
    },

    /**
     * 处理用户建议
     * @param {string} suggestion - 建议内容
     */
    handleUseSuggestion(suggestion) {
      this.showUserSuggestion(suggestion);
    },

    /**
     * 处理用户建议取消
     */
    handleUseSuggestionCancel() {
      this.hideUserSuggestion();
    },

    /**
     * 处理弹窗隐藏
     */
    handlePopoverHide() {
      this.hideUserSuggestion();
    },

    /**
     * 删除翻译结果行
     * @param {Object} row - 要删除的行
     */
    handleDelete(row) {
      const index = this.translationResult.findIndex((item) => item === row);
      if (index > -1) {
        this.removeTranslationResult(index);

        // 更新本地存储
        const translationData = this.translationResult.map((item) => ({
          en: item.en,
          cn: item.cn,
          jp: item.jp,
        }));
        this.saveTranslationToLocal(translationData);

        // 如果删除后没有数据了，关闭对话框
        if (this.translationResult.length === 0) {
          this.closeDialog();
          ElMessage.info("All data deleted");
        } else {
          ElMessage.success("Row deleted successfully");
        }
      }
    },

    /**
     * 清除编辑器内容
     */
    handleClear() {
      this.clearCodeContent();
      // 清空缓存
      const cache = useTranslationCache();
      cache.clearCache();
    },

    /**
     * 执行上传操作
     */
    async executeUpload() {
      if (this.translationResult.length === 0) {
        ElMessage.warning("No translation data to upload");
        return;
      }

      this.setUploading(true);

      try {
        const lokaliseUpload = useLokaliseUpload();
        await lokaliseUpload.uploadToLokalise(
          this.translationResult,
          this.uploadForm
        );
        this.setUploadSuccess(true, "Upload completed successfully");
      } catch (error) {
        console.error("Upload failed:", error);
        ElMessage.error("Upload failed");
      } finally {
        this.setUploading(false);
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
      this.uploadForm.tag = tag;
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

    /**
     * 获取状态文本
     */
    getStatusText() {
      if (this.isTranslating) {
        return "正在翻译...";
      }
      if (this.loadingStates.translation) {
        return "正在处理翻译结果...";
      }
      return "加载中...";
    },
  },

  // 启用持久化存储
  persist: {
    key: "translation-store",
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
    paths: ["codeContent", "hasLastTranslation", "lastTranslation"],
  },
});
