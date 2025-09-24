/**
 * Translation 模块统一导出
 * 提供向后兼容的 API 接口
 */

import { defineStore } from "pinia";
import { useTranslationCoreStore } from "./core.js";
import { useUploadStore } from "./upload.js";
import { useExportStore } from "./export.js";
import { useDeduplicateStore } from "./deduplicate.js";
import { ElMessage } from "element-plus";

/**
 * 统一的翻译管理 Store
 * 为了保持向后兼容，提供原有的 useTranslationStore 接口
 */
export const useTranslationStore = defineStore("translation", {
  state: () => ({
    // 核心翻译功能状态
    codeContent: "",
    translationResult: [],
    dialogVisible: false,
    isTranslating: false,
    coreLoadingStates: {
      translation: false,
    },
    userSuggestion: "",
    userSuggestionVisible: false,
    formRef: null,
    formData: {},
    hasLastTranslation: false,
    lastTranslation: [],

    // 上传功能状态
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
    uploadLoadingStates: {
      upload: false,
    },

    // 导出功能状态
    excelBaselineKey: "",
    excelOverwrite: false,
    exportLoadingStates: {
      export: false,
    },

    // 去重功能状态
    deduplicateDialogVisible: false,
    selectedProject: "AmazonSearch",
    isDeduplicating: false,
    isAutoDeduplicate: false,
  }),

  getters: {
    // 核心功能 getters
    hasTranslationResult: (state) => state.translationResult.length > 0,
    hasContent: (state) => !!state.codeContent?.trim(),
    translationCount: (state) => state.translationResult.length,

    // 上传功能 getters
    canUpload: (state) =>
      state.translationResult.length > 0 && !state.isTranslating,

    // 导出功能 getters
    canExport: (state) =>
      state.translationResult.length > 0 && !state.isTranslating,

    // 通用 getters
    isLoading: (state) =>
      Object.values(state.coreLoadingStates).some((loading) => loading) ||
      Object.values(state.uploadLoadingStates).some((loading) => loading) ||
      Object.values(state.exportLoadingStates).some((loading) => loading),
  },

  actions: {
    // 核心翻译功能方法
    setCodeContent(content) {
      const coreStore = useTranslationCoreStore();
      coreStore.setCodeContent(content);
      this.codeContent = content || "";
    },

    clearCodeContent() {
      const coreStore = useTranslationCoreStore();
      coreStore.clearCodeContent();
      this.codeContent = "";
    },

    setTranslationResult(result) {
      const coreStore = useTranslationCoreStore();
      coreStore.setTranslationResult(result);
      this.translationResult = result || [];
    },

    addTranslationResult(item) {
      const coreStore = useTranslationCoreStore();
      coreStore.addTranslationResult(item);
      this.translationResult.push(item);
    },

    removeTranslationResult(index) {
      const coreStore = useTranslationCoreStore();
      coreStore.removeTranslationResult(index);
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult.splice(index, 1);
      }
    },

    updateTranslationResult(index, item) {
      const coreStore = useTranslationCoreStore();
      coreStore.updateTranslationResult(index, item);
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index] = {
          ...this.translationResult[index],
          ...item,
        };
      }
    },

    clearTranslationResult() {
      const coreStore = useTranslationCoreStore();
      coreStore.clearTranslationResult();
      this.translationResult = [];
    },

    setDialogVisible(visible) {
      const coreStore = useTranslationCoreStore();
      coreStore.setDialogVisible(visible);
      this.dialogVisible = visible;
    },

    openDialog() {
      const coreStore = useTranslationCoreStore();
      coreStore.openDialog();
      this.dialogVisible = true;
    },

    closeDialog() {
      const coreStore = useTranslationCoreStore();
      coreStore.closeDialog();
      this.dialogVisible = false;
    },

    setTranslating(translating) {
      const coreStore = useTranslationCoreStore();
      coreStore.setTranslating(translating);
      this.isTranslating = translating;
    },

    startTranslation() {
      const coreStore = useTranslationCoreStore();
      coreStore.startTranslation();
      this.isTranslating = true;
      this.setLoading("translation", true);
    },

    finishTranslation() {
      const coreStore = useTranslationCoreStore();
      coreStore.finishTranslation();
      this.isTranslating = false;
      this.setLoading("translation", false);
    },

    // 上传功能方法
    setUploadDialogVisible(visible) {
      const uploadStore = useUploadStore();
      uploadStore.setUploadDialogVisible(visible);
      this.uploadDialogVisible = visible;
    },

    openUploadDialog() {
      const uploadStore = useUploadStore();
      uploadStore.openUploadDialog();
      this.uploadDialogVisible = true;
    },

    closeUploadDialog() {
      const uploadStore = useUploadStore();
      uploadStore.closeUploadDialog();
      this.uploadDialogVisible = false;
      this.uploadForm = {
        projectId: "",
        tag: "",
        description: "",
      };
      this.isUploading = false;
      this.isUploadSuccess = false;
      this.successMessage = "";
    },

    setUploading(uploading) {
      const uploadStore = useUploadStore();
      uploadStore.setUploading(uploading);
      this.isUploading = uploading;
      this.setLoading("upload", uploading);
    },

    setUploadSuccess(success, message = "") {
      const uploadStore = useUploadStore();
      uploadStore.setUploadSuccess(success, message);
      this.isUploadSuccess = success;
      this.successMessage = message;
    },

    setProjectList(projects) {
      const uploadStore = useUploadStore();
      uploadStore.setProjectList(projects);
      this.projectList = projects || [];
    },

    setCurrentProject(project) {
      const uploadStore = useUploadStore();
      uploadStore.setCurrentProject(project);
      this.currentProject = project;
    },

    setUploadProjectId(projectId) {
      const uploadStore = useUploadStore();
      uploadStore.setUploadProjectId(projectId);
      this.uploadForm.projectId = projectId;
    },

    setUploadTag(tag) {
      const uploadStore = useUploadStore();
      uploadStore.setUploadTag(tag);
      this.uploadForm.tag = tag;
    },

    uploadToLokalise(translationResult) {
      const uploadStore = useUploadStore();
      uploadStore.uploadToLokalise(translationResult);
    },

    async executeUpload(translationResult) {
      const uploadStore = useUploadStore();
      await uploadStore.executeUpload(translationResult);
    },

    handleProjectChange(projectId) {
      const uploadStore = useUploadStore();
      uploadStore.handleProjectChange(projectId);
      this.uploadForm.projectId = projectId;
      const project = this.projectList.find((p) => p.project_id === projectId);
      this.setCurrentProject(project);
    },

    // 导出功能方法
    exportExcel(translationResult) {
      const exportStore = useExportStore();
      exportStore.exportExcel(translationResult);
    },

    saveExcelBaselineKey(key) {
      const exportStore = useExportStore();
      const result = exportStore.saveExcelBaselineKey(key);
      if (result) {
        this.excelBaselineKey = key?.trim() || "";
      }
      return result;
    },

    updateExcelOverwrite(overwrite) {
      const exportStore = useExportStore();
      exportStore.updateExcelOverwrite(overwrite);
      this.excelOverwrite = overwrite;
    },

    // 去重功能方法
    setDeduplicateDialogVisible(visible) {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.setDeduplicateDialogVisible(visible);
      this.deduplicateDialogVisible = visible;
    },

    openDeduplicateDialog() {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.openDeduplicateDialog();
      this.deduplicateDialogVisible = true;
    },

    closeDeduplicateDialog() {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.closeDeduplicateDialog();
      this.deduplicateDialogVisible = false;
      this.isDeduplicating = false;
      this.isAutoDeduplicate = false;
    },

    setSelectedProject(project) {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.setSelectedProject(project);
      this.selectedProject = project;
    },

    setAutoDeduplicate(isAuto) {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.setAutoDeduplicate(isAuto);
      this.isAutoDeduplicate = isAuto;
    },

    handleDeduplicate() {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.handleDeduplicate();
      this.setAutoDeduplicate(false);
      this.openDeduplicateDialog();
    },

    handleShowAutoDeduplicateDialog() {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.handleShowAutoDeduplicateDialog();
      this.setAutoDeduplicate(true);
      this.openDeduplicateDialog();
    },

    setDeduplicating(deduplicating) {
      const deduplicateStore = useDeduplicateStore();
      deduplicateStore.setDeduplicating(deduplicating);
      this.isDeduplicating = deduplicating;
    },

    async executeDeduplicate(codeContent, continueTranslation, clearCache) {
      const deduplicateStore = useDeduplicateStore();
      return await deduplicateStore.executeDeduplicate(
        codeContent,
        continueTranslation,
        clearCache
      );
    },

    // 通用方法
    setLoading(key, loading) {
      if (this.coreLoadingStates.hasOwnProperty(key)) {
        this.coreLoadingStates[key] = loading;
      }
      if (this.uploadLoadingStates.hasOwnProperty(key)) {
        this.uploadLoadingStates[key] = loading;
      }
      if (this.exportLoadingStates.hasOwnProperty(key)) {
        this.exportLoadingStates[key] = loading;
      }
    },

    async withLoading(key, asyncFn) {
      try {
        this.setLoading(key, true);
        const result = await asyncFn();
        return result;
      } finally {
        this.setLoading(key, false);
      }
    },

    initializeTranslationSettings() {
      const coreStore = useTranslationCoreStore();
      const uploadStore = useUploadStore();
      const exportStore = useExportStore();
      const deduplicateStore = useDeduplicateStore();

      coreStore.loadLastTranslation();
      uploadStore.initializeUploadSettings();
      exportStore.initializeExportSettings();
      deduplicateStore.initializeDeduplicateSettings();

      // 同步状态到当前 store
      this.hasLastTranslation = coreStore.hasLastTranslation;
      this.lastTranslation = coreStore.lastTranslation;
      this.uploadForm.projectId = uploadStore.uploadForm.projectId;
      this.uploadForm.tag = uploadStore.uploadForm.tag;
      this.excelBaselineKey = exportStore.excelBaselineKey;
      this.excelOverwrite = exportStore.excelOverwrite;
      this.selectedProject = deduplicateStore.selectedProject;
    },

    async handleTranslate() {
      const coreStore = useTranslationCoreStore();
      const deduplicateStore = useDeduplicateStore();

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

    async continueTranslation() {
      const coreStore = useTranslationCoreStore();
      await coreStore.continueTranslation();

      // 同步状态
      this.translationResult = coreStore.translationResult;
      this.dialogVisible = coreStore.dialogVisible;
    },

    showLastTranslation() {
      const coreStore = useTranslationCoreStore();
      coreStore.showLastTranslation();
      this.translationResult = coreStore.translationResult;
      this.dialogVisible = coreStore.dialogVisible;
    },

    handleClear() {
      const coreStore = useTranslationCoreStore();
      coreStore.handleClear();
      this.codeContent = "";
    },

    saveTranslationToLocal(data) {
      const coreStore = useTranslationCoreStore();
      coreStore.saveTranslationToLocal(data);
      this.lastTranslation = coreStore.lastTranslation;
      this.hasLastTranslation = coreStore.hasLastTranslation;
    },

    loadLastTranslation() {
      const coreStore = useTranslationCoreStore();
      coreStore.loadLastTranslation();
      this.lastTranslation = coreStore.lastTranslation;
      this.hasLastTranslation = coreStore.hasLastTranslation;
    },

    handleDelete(row) {
      const coreStore = useTranslationCoreStore();
      coreStore.handleDelete(row);
      const index = this.translationResult.findIndex((item) => item === row);
      if (index > -1) {
        this.removeTranslationResult(index);
        if (this.translationResult.length === 0) {
          this.closeDialog();
        }
      }
    },

    enterEditMode(index, field) {
      const coreStore = useTranslationCoreStore();
      coreStore.enterEditMode(index, field);
      if (index >= 0 && index < this.translationResult.length) {
        this.translationResult[index][`editing_${field}`] = true;
      }
    },

    resetAll() {
      const coreStore = useTranslationCoreStore();
      const uploadStore = useUploadStore();
      const deduplicateStore = useDeduplicateStore();

      coreStore.resetAll();
      uploadStore.resetUploadState();
      deduplicateStore.resetDeduplicateState();

      // 重置当前 store 状态
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
  },
});

// 导出各个子 store
export {
  useTranslationCoreStore,
  useUploadStore,
  useExportStore,
  useDeduplicateStore,
};
