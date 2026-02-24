/**
 * 翻译与术语匹配的静态配置
 * 原 Advanced Settings 中的项已移至此，不再在 UI 中展示
 */
export const TRANSLATION_CONFIG = {
  /** 翻译温度 (0–2)，默认 0.1 */
  translationTemperature: 0.1,
  /** 术语相似度阈值 (0.5–1)，默认 0.7 */
  similarityThreshold: 0.7,
  /** Top K 结果数量 (1–50)，默认 10 */
  topK: 10,
  /** 最大 N-gram 长度 (1–5)，默认 3 */
  maxNGram: 3,
};
