/**
 * useTranslateWord - 单词查词 Composable（流式逐行展示）
 * 流式接收时增量解析，音标和词条随解析完成逐行出现；结束后解析为完整 result
 *
 * @returns {{ loading: Ref<boolean>, partialResult: Ref<PartialWordResult|null>, result: Ref<WordResult|null>, error: Ref<Error|null>, execute: (word: string) => Promise<void> }}
 *
 * @typedef {{ pronunciation: string|null, entries: Array }} PartialWordResult
 * @typedef {{ pronunciation: string, entries: Array }} WordResult
 */

import { ref } from "vue";
import {
  translateWordStream,
  parseWordResultContent,
  parsePartialWordResult,
} from "../services/translate/translateService.js";

export function useTranslateWord() {
  const loading = ref(false);
  const partialResult = ref(null);
  const result = ref(null);
  const error = ref(null);

  /**
   * 执行查词（流式：每块更新 partialResult 逐行展示，结束后解析为 result）
   */
  async function execute(word) {
    if (!word?.trim()) {
      result.value = null;
      partialResult.value = null;
      error.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    result.value = null;
    partialResult.value = null;
    try {
      let full = "";
      for await (const chunk of translateWordStream(word.trim())) {
        full += chunk;
        const partial = parsePartialWordResult(full);
        if (partial.pronunciation || partial.entries.length > 0) {
          partialResult.value = partial;
        }
      }
      try {
        const data = parseWordResultContent(full);
        if (data && typeof data.pronunciation === "string" && Array.isArray(data.entries)) {
          result.value = data;
          partialResult.value = null;
        }
      } catch (_) {
        result.value = null;
      }
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  return { loading, partialResult, result, error, execute };
}
