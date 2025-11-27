import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import {
  getAvailableLanguages,
  getLanguageIso,
} from "../../config/languages.js";
import { uploadTranslationKeys } from "../../requests/lokalise.js";
import { useExportStore } from "./export.js";

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

      // 获取baseline key
      const baselineKey = localStorage.getItem("excel_baseline_key") || "";

      // 生成自增序列key的函数
      const generateIncrementalKey = (baselineKey, index) => {
        const match = baselineKey.match(/^([a-zA-Z]+)(\d+)$/);
        if (!match) {
          return baselineKey;
        }
        const [, prefix, numberStr] = match;
        const baseNumber = parseInt(numberStr, 10);
        const newNumber = baseNumber + index;
        return `${prefix}${newNumber}`;
      };

      // 准备上传数据
      const keys = translationResult.map((item, index) => {
        // 根据baseline key是否为空决定key的生成方式
        let keyName;
        if (baselineKey && baselineKey.trim()) {
          keyName = generateIncrementalKey(baselineKey.trim(), index);
        } else {
          // 如果baseline key为空，使用en作为key
          keyName = item.en;
        }

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

      // 执行上传
      await uploadTranslationKeys(
        selectedProject.project_id,
        keys,
        this.uploadForm.tag ? [this.uploadForm.tag] : [],
        apiToken
      );
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
