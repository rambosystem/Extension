import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import { useLokaliseUpload } from "../../composables/Upload/useLokaliseUpload.js";

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
     * 上传翻译结果到Lokalise
     * @param {Array} translationResult - 翻译结果
     */
    uploadToLokalise(translationResult) {
      if (translationResult.length === 0) {
        ElMessage.warning("No translation data to upload");
        return;
      }

      const lokaliseUpload = useLokaliseUpload();
      lokaliseUpload.uploadToLokalise(translationResult);
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

      this.setUploading(true);

      try {
        const lokaliseUpload = useLokaliseUpload();
        await lokaliseUpload.uploadToLokalise(
          translationResult,
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
