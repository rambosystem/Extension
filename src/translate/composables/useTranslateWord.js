/**
 * useTranslateWord - 单词查词 Composable
 * 调用翻译服务获取单词释义（音标 + 条目列表），管理 loading / result / error 状态
 *
 * @returns {{ loading: Ref<boolean>, result: Ref<WordResult|null>, error: Ref<Error|null>, execute: (word: string) => Promise<void> }}
 *
 * @typedef {Object} WordResult
 * @property {string} pronunciation - 音标
 * @property {Array<{ part_of_speech: string, meaning: string, example: string, example_translation: string }>} entries - 条目列表 [词性, 释义, 例句原文, 例句中文]
 */

import { ref } from "vue";
import { translateWord } from "../services/translate/translateService.js";

export function useTranslateWord() {
  const loading = ref(false);
  const result = ref(null);
  const error = ref(null);

  /**
   * 执行查词
   * @param {string} word - 待查单词，空字符串会直接返回不请求
   */
  async function execute(word) {
    if (!word?.trim()) {
      result.value = null;
      error.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    result.value = null;
    try {
      result.value = await translateWord(word.trim());
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, result, error, execute };
}
