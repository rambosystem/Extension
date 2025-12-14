import { defineStore } from "pinia";
import { nextTick } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "../composables/Core/useI18n.js";
import { getUserProjects } from "../requests/lokalise.js";

/**
 * Library 页面状态管理
 * 管理筛选条件、项目列表、表格数据等状态
 */
export const useLibraryStore = defineStore("library", {
  state: () => ({
    // 筛选条件
    filterKeyName: "",
    filterProject: [],
    filterCondition: "contains_or",

    // 项目列表
    projectList: [],

    // 表格数据
    tableData: [],

    // 加载状态
    loading: false,

    // 筛选条件选项
    filterConditions: [
      { label: "Contains(or)", value: "contains_or" },
      { label: "Contains(and)", value: "contains_and" },
      { label: "Equals", value: "equals" },
      { label: "Starts with", value: "starts_with" },
      { label: "Ends with", value: "ends_with" },
    ],
  }),

  getters: {
    /**
     * 获取当前筛选条件的显示文本
     */
    filterConditionText: (state) => {
      const condition = state.filterConditions.find(
        (c) => c.value === state.filterCondition
      );
      return condition ? condition.label : "Contains(or)";
    },

    /**
     * 获取已选择的项目（过滤掉 __SELECT_ALL__ 标记）
     */
    selectedProjects: (state) => {
      return state.filterProject.filter((p) => p !== "__SELECT_ALL__");
    },

    /**
     * 检查是否有筛选条件
     */
    hasFilters: (state) => {
      return (
        !!state.filterKeyName ||
        (state.filterProject.length > 0 &&
          state.filterProject.some((p) => p !== "__SELECT_ALL__"))
      );
    },
  },

  actions: {
    /**
     * 设置筛选 Key Name
     * @param {string} value - Key Name 值
     */
    setFilterKeyName(value) {
      this.filterKeyName = value;
    },

    /**
     * 设置筛选项目
     * @param {Array} projects - 项目数组
     */
    setFilterProject(projects) {
      this.filterProject = projects;
    },

    /**
     * 设置筛选条件
     * @param {string} condition - 条件值
     */
    setFilterCondition(condition) {
      this.filterCondition = condition;
    },

    /**
     * 清除所有筛选条件
     */
    clearFilters() {
      this.filterKeyName = "";
      this.filterProject = [];
    },

    /**
     * 加载项目列表
     */
    async loadProjectList() {
      try {
        const savedProjects = localStorage.getItem("lokalise_projects");
        if (savedProjects) {
          try {
            const parsedProjects = JSON.parse(savedProjects);
            if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
              this.projectList = parsedProjects;
              return;
            }
          } catch (e) {
            console.warn("Failed to parse saved projects:", e);
          }
        }

        try {
          const projects = await getUserProjects();
          this.projectList = projects;
          localStorage.setItem("lokalise_projects", JSON.stringify(projects));
        } catch (error) {
          console.warn("Failed to fetch projects from API:", error);
          this.projectList = [];
        }
      } catch (error) {
        console.error("Failed to load project list:", error);
        this.projectList = [];
      }
    },

    /**
     * 处理项目选择变化，处理"Select All"逻辑
     * 注意：这个方法应该在 watch 中调用，而不是直接绑定到 v-model
     */
    handleProjectSelectChange(newValue) {
      if (!Array.isArray(newValue) || this.projectList.length === 0) {
        // 如果新值不是数组或项目列表为空，直接更新
        this.filterProject = newValue;
        return;
      }

      const hasSelectAll = newValue.includes("__SELECT_ALL__");

      if (hasSelectAll) {
        // 如果选择了"Select All"，则选择所有项目（移除"__SELECT_ALL__"标记）
        const allProjectNames = this.projectList.map((p) => p.name);
        // 使用 nextTick 避免在 watch 中直接修改导致的问题
        nextTick(() => {
          this.filterProject = allProjectNames;
        });
      } else {
        // 如果没有选择 "Select All"，直接更新
        this.filterProject = newValue;
      }
    },

    /**
     * 加载表格数据
     */
    async loadTableData() {
      this.loading = true;
      try {
        // TODO: Replace with real API call
        this.tableData = [
          {
            keyName: "common.welcome",
            project: "Common",
            english: "Welcome",
            chinese: "欢迎",
            spanish: "Bienvenido",
          },
          {
            keyName: "common.save",
            project: "Common",
            english: "Save",
            chinese: "保存",
            spanish: "Guardar",
          },
          {
            keyName: "search.title",
            project: "AmazonSearch",
            english: "Search Products, Brands and Categories,Search Products, Brands and Categories",
            chinese: "搜索产品",
            spanish: "Buscar Productos",
          },
          {
            keyName: "commerce.addToCart",
            project: "Commerce",
            english: "Add to Cart",
            chinese: "加入购物车",
            spanish: "Añadir al carrito",
          },
        ];
      } catch (error) {
        console.error("Failed to load translation keys:", error);
        const { t } = useI18n();
        ElMessage.error(t("library.loadFailed"));
      } finally {
        this.loading = false;
      }
    },

    /**
     * 执行搜索
     */
    async search() {
      this.loading = true;
      try {
        // TODO: 调用后端API，传递筛选条件
        // const params = {
        //   keyNames: this.filterKeyName
        //     .split(/[\n,]/)
        //     .map((key) => key.trim())
        //     .filter((key) => key.length > 0),
        //   condition: this.filterCondition,
        //   projects: this.selectedProjects.length > 0 ? this.selectedProjects : null,
        // };
        // const data = await fetchTranslationKeys(params);
        // this.tableData = data;

        // 临时：保持现有模拟数据，后续替换为真实API调用
        await this.loadTableData();
      } catch (error) {
        console.error("Failed to search translation keys:", error);
        const { t } = useI18n();
        ElMessage.error(t("library.loadFailed"));
      } finally {
        this.loading = false;
      }
    },
  },
});
