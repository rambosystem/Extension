/**
 * useTranslateSentence - 句子/段落翻译 Composable（流式展示）
 * 调用 DeepSeek 将选中文本译为中文，流式累积译文供界面实时展示
 *
 * @returns {{ loading: Ref<boolean>, result: Ref<string>, error: Ref<Error|null>, execute: (text: string) => Promise<void> }}
 */

import { ref } from "vue";
import { translateSentenceStream } from "../services/translate/translateService.js";

export function useTranslateSentence() {
  const loading = ref(false);
  const result = ref("");
  const error = ref(null);

  /**
   * 执行句子翻译（流式：边收边更新 result）
   */
  async function execute(text) {
    if (!text?.trim()) {
      result.value = "";
      error.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    result.value = "";
    try {
      let full = "";
      for await (const chunk of translateSentenceStream(text.trim())) {
        full += chunk;
        result.value = full;
      }
    } catch (e) {
      error.value = e;
      result.value = "";
    } finally {
      loading.value = false;
    }
  }

  return { loading, result, error, execute };
}
