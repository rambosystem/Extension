<template>
  <el-container class="translate_popup_container" direction="vertical">
    <el-header class="popup_header" @mousedown="onHeaderMouseDown">
      <div class="header_icon header_drag_area">
        <img src="@/assets/icon.svg" class="logo_icon" draggable="false" alt="logo" />
      </div>
      <div class="header_button_group">
        <button type="button" class="header_btn pin_btn" :class="{ is_pinned: isPinned }"
          :title="isPinned ? 'Unpin' : 'Pin'" @click.stop="togglePin">
          <img src="@/assets/fixed.svg" class="pin_icon_img" alt="" draggable="false" />
        </button>
        <button type="button" class="header_btn setting_icon" title="Translate settings" @click="handleSettingClick">
          <img src="@/assets/more_field.svg" class="setting_icon_img" alt="" draggable="false" />
        </button>
        <button type="button" class="header_btn close_icon" title="Close" @click="handleCloseClick">
          <el-icon :size="20">
            <Close />
          </el-icon>
        </button>
      </div>
    </el-header>
    <el-main class="popup_main">
      <!-- 单词查词 -->
      <div v-if="isWord" class="word_view">
        <div v-if="error" class="word_error">
          <span>{{ error.message || 'Query failed' }}</span>
        </div>
        <div v-else-if="loading && !displayData" class="word_loading">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>Querying...</span>
        </div>
        <template v-else-if="displayData">
          <!-- 第一行：单词 + 音标（打字机逐字） -->
          <div class="word_header">
            <span class="word_title">{{ selectionText }}</span>
            <span v-if="displayData.pronunciation" class="word_pronunciation">{{ displayedPronunciation }}</span>
            <button type="button" class="pronunciation_btn" aria-label="Pronunciation" @click="playPronunciation">
              <svg class="speaker_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
          </div>
          <!-- 词条：每行打字机逐字展示；例句播放按钮等例句有内容后再显示 -->
          <div class="word_entries">
            <div v-for="(entry, index) in displayEntries" :key="index" class="word_entry">
              <div v-if="entry.part_of_speech && entry.meaning" class="entry_row">
                <span class="entry_pos">{{ (viewEntries[index] || {}).part_of_speech }}</span>
                <span class="entry_meaning">{{ (viewEntries[index] || {}).meaning }}</span>
              </div>
              <p v-if="entry.example" class="entry_example">
                <button
                  v-if="(viewEntries[index] || {}).example"
                  type="button"
                  class="example_pronunciation_btn"
                  aria-label="Read example"
                  @click="playExample(entry.example)"
                >
                  <svg class="speaker_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                </button>
                <span v-html="renderExampleWithHighlights((viewEntries[index] || {}).example || '', (viewEntries[index] || {}).example_highlight_ranges || [])"></span>
              </p>
              <p v-if="entry.example_translation" class="entry_example_translation">{{ (viewEntries[index] ||
                {}).example_translation }}</p>
            </div>
          </div>
        </template>
      </div>
      <!-- 句子/非单词 -->
      <div v-else class="sentence_view">
        <div class="source_text">{{ selectionText || 'The selected text will be displayed here' }}</div>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { Close, Loading } from "@element-plus/icons-vue";
import { watch, computed, ref, isRef, unref, onBeforeUnmount } from "vue";
import { checkIsWord } from "./domUtils.js";
import { useTranslateWord } from "./composables/useTranslateWord.js";
import { useTypewriterDisplay } from "./composables/useTypewriterDisplay.js";
import { speak } from "./speechSynthesis.js";
import { playWithDoubao } from "./doubaoTts.js";
import { STORAGE_KEYS } from "./config/tts.js";

const props = defineProps({
  onClose: { type: Function, required: true },
  selectionText: { type: String, required: true },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
});

const isPinned = computed(() => (props.pinned != null ? unref(props.pinned) : false));

const isWord = computed(() => checkIsWord(props.selectionText));

const { loading, partialResult, result, error, execute } = useTranslateWord();

const displayData = computed(() => {
  if (result.value) return result.value;
  const p = partialResult.value;
  const hasPartialEntry =
    p?.partialEntry && Object.keys(p.partialEntry).length > 0;
  if (
    p &&
    (p.pronunciation ||
      (p.entries && p.entries.length > 0) ||
      hasPartialEntry)
  ) {
    return p;
  }
  return null;
});

/** 用于逐行展示：完整 entries + 当前未闭合的 partialEntry（若有） */
const displayEntries = computed(() => {
  const data = displayData.value;
  if (!data || !data.entries) return [];
  const list = [...data.entries];
  const partial = data.partialEntry;
  if (partial && Object.keys(partial).length > 0) list.push(partial);
  return list;
});

/** 打字机展示：pronunciation 与每条 entry 各字段逐字输出 */
const { displayedPronunciation, displayedEntries } = useTypewriterDisplay(
  () => ({
    pronunciation: displayData.value?.pronunciation ?? "",
    entries: displayEntries.value,
  }),
  () => props.selectionText,
  { charsPerMs: 15 }
);

/** 用于渲染：每条 entry 的展示文案为打字机输出（displayedEntries 与 displayEntries 同序） */
const viewEntries = computed(() =>
  displayEntries.value.map((_, i) => displayedEntries.value[i] ?? {})
);

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

function handleSettingClick() {
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: "OPEN_TRANSLATE_SETTINGS" }, () => {
      // 划词弹窗在 content 中，无 window.close；由 background 打开选项页即可
    });
  }
}

function togglePin() {
  const next = !unref(props.pinned);
  if (isRef(props.pinned)) props.pinned.value = next;
  props.setPinned?.(next);
}

let dragStartX = 0;
let dragStartY = 0;
function onHeaderMouseDown(e) {
  if (e.target.closest("button")) return;
  if (!props.onMoveBy) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const onMouseMove = (e2) => {
    const dx = e2.clientX - dragStartX;
    const dy = e2.clientY - dragStartY;
    dragStartX = e2.clientX;
    dragStartY = e2.clientY;
    props.onMoveBy?.(dx, dy);
  };
  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

/** 例句高亮：按预处理得到的高亮区间渲染（打字机输出已是纯文本，不再含 **） */
function renderExampleWithHighlights(displayedExample, ranges) {
  if (!displayedExample || typeof displayedExample !== "string") return "";
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  const len = displayedExample.length;
  if (!Array.isArray(ranges) || ranges.length === 0) return escapeHtml(displayedExample);
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let out = "";
  let last = 0;
  for (const r of sorted) {
    const rStart = Math.max(0, r.start);
    const rEnd = Math.min(r.end, len);
    if (rStart >= rEnd) continue;
    out += escapeHtml(displayedExample.slice(last, rStart));
    out += "<span class=\"example_highlight\">";
    out += escapeHtml(displayedExample.slice(rStart, rEnd));
    out += "</span>";
    last = rEnd;
  }
  out += escapeHtml(displayedExample.slice(last));
  return out;
}

// 发音用 AbortController，再次点击或组件卸载时中断
const pronunciationController = ref(null);
const exampleController = ref(null);

function playPronunciation() {
  const word = props.selectionText?.trim();
  if (!word) return;
  if (pronunciationController.value) {
    pronunciationController.value.abort();
  }
  const controller = new AbortController();
  pronunciationController.value = controller;
  const onFinish = () => {
    if (pronunciationController.value === controller) {
      pronunciationController.value = null;
    }
  };
  const doPlay = (provider) => {
    if (provider === "browser") {
      speak({
        text: word,
        lang: "en-US",
        rate: 0.9,
        volume: 1,
        signal: controller.signal,
        onFinish,
      });
      return;
    }
    playWithDoubao({
      text: word,
      rate: 0.9,
      volume: 1,
      signal: controller.signal,
      onFinish,
      onFallback: () => {
        speak({
          text: word,
          lang: "en-US",
          rate: 0.9,
          volume: 1,
          signal: controller.signal,
          onFinish,
        });
      },
    });
  };
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get([STORAGE_KEYS.PROVIDER], (out) => {
      doPlay(out[STORAGE_KEYS.PROVIDER] || "doubao");
    });
  } else {
    doPlay("doubao");
  }
}

function playExample(exampleText) {
  const raw = (exampleText || "").trim();
  const text = raw.replace(/\*\*([^*]*)\*\*/g, "$1").trim();
  if (!text) return;
  if (exampleController.value) {
    exampleController.value.abort();
  }
  const controller = new AbortController();
  exampleController.value = controller;
  const onFinish = () => {
    if (exampleController.value === controller) {
      exampleController.value = null;
    }
  };
  const doPlay = (provider) => {
    if (provider === "browser") {
      speak({
        text,
        lang: "en-US",
        rate: 0.9,
        volume: 1,
        signal: controller.signal,
        onFinish,
      });
      return;
    }
    playWithDoubao({
      text,
      rate: 0.9,
      volume: 1,
      signal: controller.signal,
      onFinish,
      onFallback: () => {
        speak({
          text,
          lang: "en-US",
          rate: 0.9,
          volume: 1,
          signal: controller.signal,
          onFinish,
        });
      },
    });
  };
  if (typeof chrome !== "undefined" && chrome.storage?.local?.get) {
    chrome.storage.local.get([STORAGE_KEYS.PROVIDER], (out) => {
      doPlay(out[STORAGE_KEYS.PROVIDER] || "doubao");
    });
  } else {
    doPlay("doubao");
  }
}

onBeforeUnmount(() => {
  if (pronunciationController.value) {
    pronunciationController.value.abort();
  }
  if (exampleController.value) {
    exampleController.value.abort();
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
  gap: 8px;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
  user-select: none;

  .header_drag_area {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &:hover {
    cursor: move;
  }

  .header_icon {
    flex: 0 0 auto;
    height: 20px;
    width: auto;
  }

  .logo_icon {
    height: 100%;
    width: auto;
    object-fit: contain;
  }

  .header_button_group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .header_btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #666;
    cursor: pointer;

    &:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .pin_icon_img,
    .setting_icon_img {
      width: 20px;
      height: 20px;
      display: block;
    }
  }

  .pin_btn.is_pinned {
    background: #e5e7eb;
    color: #374151;
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
      color: #4b5563;
      font-size: 12px;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 6px;

      :deep(.example_highlight) {
        color: #c71585;
        font-weight: 600;
      }

      /* 按钮与第一行文本等高、顶对齐，不超出首行 */
      .example_pronunciation_btn {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5em;
        height: 1.5em;
        margin-top: 0;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: #e5e7eb;
        color: #6b7280;
        cursor: pointer;
        vertical-align: top;

        &:hover {
          background: #d1d5db;
          color: #374151;
        }

        .speaker_icon {
          width: 0.75em;
          height: 0.75em;
        }
      }
    }

    .entry_example_translation {
      margin: 0;
      /* 与 entry_example 内文字左对齐：按钮宽 + 间距 */
      padding-left: calc(1.5em + 6px);
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
