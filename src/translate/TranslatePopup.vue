<template>
  <el-container class="translate_popup_container" direction="vertical">
    <el-header class="popup_header">
      <div class="header_icon">
        <img src="@/assets/logo_svg.svg" class="logo_icon" draggable="false" alt="logo" />
      </div>
      <div class="header_button_group">
        <el-icon class="close_icon" :size="20" @click="handleCloseClick">
          <Close />
        </el-icon>
      </div>
    </el-header>
    <el-main class="popup_main">
      <!-- 单词查词 -->
      <div v-if="isWord" class="word_view">
        <div v-if="loading" class="word_loading">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>查词中…</span>
        </div>
        <div v-else-if="error" class="word_error">
          <span>{{ error.message || '查词失败' }}</span>
        </div>
        <template v-else-if="result">
          <div class="word_header">
            <span class="word_title">{{ selectionText }}</span>
            <span class="word_pronunciation">{{ result.pronunciation }}</span>
            <button type="button" class="pronunciation_btn" aria-label="发音" @click="playPronunciation">
              <svg class="speaker_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
          </div>
          <div class="word_entries">
            <div v-for="(entry, index) in result.entries" :key="index" class="word_entry">
              <div class="entry_row">
                <span class="entry_pos">{{ entry.part_of_speech }}</span>
                <span class="entry_meaning">{{ entry.meaning }}</span>
              </div>
              <p class="entry_example" v-html="highlightWordInExample(entry.example, selectionText)"></p>
              <p class="entry_example_translation">{{ entry.example_translation }}</p>
            </div>
          </div>
        </template>
      </div>
      <!-- 句子/非单词 -->
      <div v-else class="sentence_view">
        <div class="source_text">{{ selectionText || '选中文本将显示在这里' }}</div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { Close, Loading } from "@element-plus/icons-vue";
import { watch, computed, ref, onBeforeUnmount } from "vue";
import { checkIsWord } from "./domUtils.js";
import { useTranslateWord } from "./composables/useTranslateWord.js";
import { speak } from "./speechSynthesis.js";

const props = defineProps({
  onClose: { type: Function, required: true },
  selectionText: { type: String, required: true },
});

const isWord = computed(() => checkIsWord(props.selectionText));

const { loading, result, error, execute } = useTranslateWord();

watch(
  () => [props.selectionText, isWord.value],
  ([text, word]) => {
    if (word && text) execute(text);
  },
  { immediate: true }
);

function handleCloseClick() {
  props.onClose();
}

/** 例句中高亮查询词（含变位，如 command -> commanded） */
function highlightWordInExample(example, word) {
  if (!example || !word) return example;
  const escaped = example.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
  const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const base = word.replace(/(?:ed|ing|s|es)$/i, "").trim() || word;
  const re = new RegExp(
    `\\b(${escapeRe(word)}|${escapeRe(base)}(?:ed|ing|s|es)?)\\b`,
    "gi"
  );
  return escaped.replace(re, "<span class=\"example_highlight\">$1</span>");
}

// 发音用 AbortController，再次点击或组件卸载时中断
const pronunciationController = ref(null);

function playPronunciation() {
  const word = props.selectionText?.trim();
  if (!word) return;
  if (pronunciationController.value) {
    pronunciationController.value.abort();
  }
  const controller = new AbortController();
  pronunciationController.value = controller;
  speak({
    text: word,
    lang: "en-US",
    rate: 0.9,
    volume: 1,
    signal: controller.signal,
    onFinish: () => {
      if (pronunciationController.value === controller) {
        pronunciationController.value = null;
      }
    },
  });
}

onBeforeUnmount(() => {
  if (pronunciationController.value) {
    pronunciationController.value.abort();
  }
});
</script>

<style scoped lang="scss">
.translate_popup_container {
  width: 320px;
  min-height: auto;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.popup_header {
  flex-shrink: 0;
  height: 44px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;

  .header_icon {
    width: 24px;
    height: 24px;
  }

  .logo_icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .header_button_group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .close_icon {
    cursor: pointer;
    color: #666;

    &:hover {
      color: #333;
    }
  }
}

.popup_main {
  padding: 12px;
  overflow-y: auto;
}

.word_view {

  .word_loading,
  .word_error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    color: #666;
    font-size: 14px;
  }

  .word_error {
    color: #f56c6c;
  }

  .word_header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
    margin-bottom: 14px;

    .word_title {
      font-weight: 700;
      font-size: 18px;
      color: #1a1a1a;
    }

    .word_pronunciation {
      font-size: 14px;
      color: #6b7280;
    }

    .pronunciation_btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: #e5e7eb;
      color: #6b7280;
      cursor: pointer;

      &:hover {
        background: #d1d5db;
        color: #374151;
      }
    }

    .speaker_icon {
      width: 14px;
      height: 14px;
    }
  }

  .word_entries {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .word_entry {
    font-size: 13px;
    line-height: 1.55;

    .entry_row {
      margin-bottom: 4px;
    }

    .entry_pos {
      display: inline-block;
      margin-right: 6px;
      color: #1a1a1a;
      font-weight: 600;
    }

    .entry_meaning {
      color: #1a1a1a;
    }

    .entry_example {
      margin: 4px 0 2px;
      padding-left: 12px;
      color: #4b5563;
      font-size: 12px;
      line-height: 1.5;

      :deep(.example_highlight) {
        color: #c71585;
        font-weight: 600;
      }
    }

    .entry_example_translation {
      margin: 0;
      padding-left: 12px;
      color: #6b7280;
      font-size: 12px;
    }
  }
}

.sentence_view {
  .source_text {
    font-size: 14px;
    line-height: 1.5;
    color: #303133;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>
