import { ElMessage } from "element-plus";
import { useI18n } from "./useI18n.js";

const { t } = useI18n();

/**
 * Lokalise上传功能Hook
 */
export function useLokaliseUpload() {
  /**
   * 直接上传翻译结果到Lokalise
   * @param {Array} translationResult - 翻译结果数组
   */
  const uploadToLokalise = async (translationResult) => {
    try {
      // 检查是否配置了Lokalise API token
      const apiToken = localStorage.getItem("lokalise_api_token");
      if (!apiToken) {
        ElMessage.warning(
          "Lokalise API token is not configured, please configure it in Settings first"
        );
        return;
      }

      // 检查是否配置了项目列表
      const projects = localStorage.getItem("lokalise_projects");
      if (!projects) {
        ElMessage.warning(
          "No Lokalise projects found, please configure API token in Settings first"
        );
        return;
      }

      // 解析项目列表
      let projectList;
      try {
        projectList = JSON.parse(projects);
      } catch (error) {
        ElMessage.error("Failed to parse project list");
        return;
      }

      if (!Array.isArray(projectList) || projectList.length === 0) {
        ElMessage.warning("No Lokalise projects available");
        return;
      }

      // 如果有多个项目，让用户选择（这里暂时选择第一个项目）
      // TODO: 后续可以添加项目选择弹窗
      const selectedProject = projectList[0];

      // 将翻译结果转换为Lokalise格式
      const keys = translationResult.map((row) => ({
        key_name: row.en, // 使用英文作为key_name
        platforms: ["web", "other"],
        translations: [
          {
            language_iso: "en",
            translation: row.en,
          },
          {
            language_iso: "zh_CN",
            translation: row.cn,
          },
          {
            language_iso: "ja",
            translation: row.jp,
          },
        ],
      }));

      // 调用Lokalise API上传
      const { uploadTranslationKeys } = await import("../requests/lokalise.js");
      const result = await uploadTranslationKeys(
        selectedProject.project_id,
        keys
      );

      ElMessage.success(
        `Successfully uploaded ${keys.length} translation keys to project: ${selectedProject.name}`
      );
    } catch (error) {
      console.error("Upload to Lokalise failed:", error);
      ElMessage.error(`Upload failed: ${error.message}`);
    }
  };

  return {
    uploadToLokalise,
  };
}
