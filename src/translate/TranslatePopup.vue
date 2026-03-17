<template>
  <PopupFrame
    :on-close="onClose"
    show-pin
    show-settings
    setting-title="Translate settings"
    :setting-route="ROUTE_INDEX.TRANSLATE"
    :pinned="pinned"
    :set-pinned="setPinned"
    :on-move-by="onMoveBy"
  >
    <div v-if="isComposerMode" class="composer_view">
      <div class="composer_editor allow_text_input">
        <textarea
          v-model="editorText"
          class="composer_textarea"
          placeholder="输入 Markdown 内容..."
        />
      </div>
      <div v-if="composerError" class="composer_error">
        {{ composerError }}
      </div>
      <div class="composer_actions">
        <button
          type="button"
          class="composer_primary_btn"
          :disabled="!canOperate || composerLoading"
          @click="translateAndInsert"
        >
          <el-icon v-if="composerLoading" class="is-loading">
            <Loading />
          </el-icon>
          <span v-else>✦</span>
          <span>翻译并插入</span>
        </button>
        <div class="composer_secondary_actions">
          <button
            type="button"
            class="composer_secondary_btn"
            :disabled="!canOperate || composerLoading"
            @click="translateToEnglish"
          >
            <span class="btn_icon btn_icon_blue">文A</span>
            <span>翻译为英文</span>
          </button>
          <button
            type="button"
            class="composer_secondary_btn"
            :disabled="!canInsertText"
            @click="insertCurrentText"
          >
            <span class="btn_icon btn_icon_green">→|</span>
            <span>插入</span>
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="isWord" class="word_view">
      <div v-if="error" class="word_error">
        <span>{{ error.message || "Query failed" }}</span>
      </div>
      <div v-else-if="loading && !displayData" class="word_loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>Querying...</span>
      </div>
      <template v-else-if="displayData">
        <div class="word_header">
          <span class="word_title">{{ selectionText }}</span>
          <span v-if="displayData.pronunciation" class="word_pronunciation">{{
            displayedPronunciation
          }}</span>
          <button
            type="button"
            class="pronunciation_btn"
            aria-label="Pronunciation"
            @click="playPronunciation"
          >
            <el-icon
              v-if="pronunciationLoading"
              class="is-loading speaker_icon_wrap"
            >
              <Loading />
            </el-icon>
            <svg
              v-else
              class="speaker_icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path
                d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
              />
            </svg>
          </button>
        </div>
        <div class="word_entries">
          <div
            v-for="(entry, index) in displayEntries"
            :key="index"
            class="word_entry"
          >
            <div v-if="entry.part_of_speech && entry.meaning" class="entry_row">
              <span class="entry_pos">{{
                (viewEntries[index] || {}).part_of_speech
              }}</span>
              <span class="entry_meaning">{{
                (viewEntries[index] || {}).meaning
              }}</span>
            </div>
            <p v-if="entry.example" class="entry_example">
              <button
                v-if="(viewEntries[index] || {}).example"
                type="button"
                class="example_pronunciation_btn"
                aria-label="Read example"
                @click="playExample(entry.example, index)"
              >
                <el-icon
                  v-if="exampleLoadingIndex === index"
                  class="is-loading example_speaker_icon_wrap"
                >
                  <Loading />
                </el-icon>
                <svg
                  v-else
                  class="speaker_icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path
                    d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"
                  />
                </svg>
              </button>
              <span
                v-html="
                  renderExampleWithHighlights(
                    (viewEntries[index] || {}).example || '',
                    (viewEntries[index] || {}).example_highlight_ranges || [],
                  )
                "
              ></span>
            </p>
            <p
              v-if="entry.example_translation"
              class="entry_example_translation"
            >
              {{ (viewEntries[index] || {}).example_translation }}
            </p>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="sentence_view">
      <div v-if="sentenceError" class="sentence_error">
        <span>{{ sentenceError.message || "Translation failed" }}</span>
      </div>
      <div
        v-else-if="sentenceLoading && !sentenceResult"
        class="sentence_loading"
      >
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>Translating...</span>
      </div>
      <div v-else class="translation_row">
        <div class="translation_text">{{ sentenceResult || "" }}</div>
        <div class="sentence_actions">
          <div class="sentence_button_group">
            <button
              type="button"
              class="action_btn"
              aria-label="Replace with translation"
              :disabled="!sentenceResult"
              @click="replaceTranslation"
            >
              <img
                src="@/assets/replace.svg"
                class="action_icon"
                alt=""
                draggable="false"
              />
            </button>
            <button
              type="button"
              class="action_btn"
              aria-label="Copy translation"
              :disabled="!sentenceResult"
              @click="copyTranslation"
            >
              <img
                src="@/assets/copy.svg"
                class="action_icon"
                alt=""
                draggable="false"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </PopupFrame>
</template>

<script setup>
import { Loading } from "@element-plus/icons-vue";
import { watch, computed, ref, onBeforeUnmount, isRef, unref } from "vue";
import PopupFrame from "@/components/PopupFrame.vue";
import { ROUTE_INDEX } from "@/routes/constants.js";
import { checkIsWord } from "./domUtils.js";
import { useTranslateWord } from "@/lokalise/composables/translate/useTranslateWord.js";
import { useTranslateSentence } from "@/lokalise/composables/translate/useTranslateSentence.js";
import { useTypewriterDisplay } from "@/lokalise/composables/translate/useTypewriterDisplay.js";
import { speak } from "./speechSynthesis.js";
import { playWithDoubao } from "./doubaoTts.js";
import { STORAGE_KEYS } from "./config/tts.js";
import { useFavorites } from "@/lokalise/composables/translate/useClipboard.js";
import { translateToEnglishStream } from "./services/translate/translateService.js";

const props = defineProps({
  onClose: { type: Function, required: true },
  selectionText: { type: String, default: "" },
  lastFocusedEditable: { type: Object, default: null },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
  onReplace: { type: Function, default: null },
});

const isComposerMode = computed(() => !props.selectionText?.trim());
const isWord = computed(() => checkIsWord(props.selectionText));

const editorText = ref("");
const composerLoading = ref(false);
const composerError = ref("");

const { loading, partialResult, result, error, execute } = useTranslateWord();
const {
  loading: sentenceLoading,
  result: sentenceResult,
  error: sentenceError,
  execute: executeSentence,
} = useTranslateSentence();
const { copy: copyToFavorites } = useFavorites();

const canOperate = computed(() => !!editorText.value.trim());
const canInsertText = computed(() => !!editorText.value.trim());

function isPinnedActive() {
  if (isRef(props.pinned)) return !!props.pinned.value;
  return !!unref(props.pinned);
}

function copyTranslation() {
  if (sentenceResult.value) copyToFavorites(sentenceResult.value);
}

function replaceTranslation() {
  if (!sentenceResult.value) return;
  props.onReplace?.(sentenceResult.value);
}

async function runTranslateToEnglish() {
  const text = editorText.value.trim();
  if (!text) return "";
  composerLoading.value = true;
  composerError.value = "";
  try {
    let full = "";
    for await (const chunk of translateToEnglishStream(text)) {
      full += chunk;
      editorText.value = full;
    }
    return full.trim();
  } catch (e) {
    composerError.value = e?.message || "Translation failed";
    throw e;
  } finally {
    composerLoading.value = false;
  }
}

async function translateToEnglish() {
  if (!canOperate.value) return;
  try {
    await runTranslateToEnglish();
  } catch (_) {}
}

function insertIntoFocused(text) {
  if (!text) return false;
  document.dispatchEvent(
    new CustomEvent("clipboard-paste-to-focused", {
      detail: { text },
    }),
  );
  return true;
}

function insertCurrentText() {
  const text = editorText.value.trim();
  if (!text) return;
  insertIntoFocused(text);
  if (!isPinnedActive()) {
    props.onClose?.();
  }
}

async function translateAndInsert() {
  if (!canOperate.value) return;
  try {
    const translated = await runTranslateToEnglish();
    if (!translated) return;
    insertIntoFocused(translated);
    if (!isPinnedActive()) {
      props.onClose?.();
    }
  } catch (_) {}
}

const displayData = computed(() => {
  if (result.value) return result.value;
  const p = partialResult.value;
  const hasPartialEntry =
    p?.partialEntry && Object.keys(p.partialEntry).length > 0;
  if (
    p &&
    (p.pronunciation || (p.entries && p.entries.length > 0) || hasPartialEntry)
  ) {
    return p;
  }
  return null;
});

const displayEntries = computed(() => {
  const data = displayData.value;
  if (!data || !data.entries) return [];
  const list = [...data.entries];
  const partial = data.partialEntry;
  if (partial && Object.keys(partial).length > 0) list.push(partial);
  return list;
});

const { displayedPronunciation, displayedEntries } = useTypewriterDisplay(
  () => ({
    pronunciation: displayData.value?.pronunciation ?? "",
    entries: displayEntries.value,
  }),
  () => props.selectionText,
  { charsPerMs: 15 },
);

const viewEntries = computed(() =>
  displayEntries.value.map((_, i) => displayedEntries.value[i] ?? {}),
);

watch(
  () => [props.selectionText, isWord.value, isComposerMode.value],
  ([text, word, composerMode]) => {
    if (composerMode) return;
    if (word && text) execute(text);
    else if (!word && text) executeSentence(text);
  },
  { immediate: true },
);

function renderExampleWithHighlights(displayedExample, ranges) {
  if (!displayedExample || typeof displayedExample !== "string") return "";
  const escapeHtml = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const len = displayedExample.length;
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return escapeHtml(displayedExample);
  }
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let out = "";
  let last = 0;
  for (const r of sorted) {
    const rStart = Math.max(0, r.start);
    const rEnd = Math.min(r.end, len);
    if (rStart >= rEnd) continue;
    out += escapeHtml(displayedExample.slice(last, rStart));
    out += '<span class="example_highlight">';
    out += escapeHtml(displayedExample.slice(rStart, rEnd));
    out += "</span>";
    last = rEnd;
  }
  out += escapeHtml(displayedExample.slice(last));
  return out;
}

const pronunciationController = ref(null);
const exampleController = ref(null);
const pronunciationLoading = ref(false);
const exampleLoadingIndex = ref(null);

function playPronunciation() {
  const word = props.selectionText?.trim();
  if (!word) return;
  if (pronunciationController.value) {
    pronunciationController.value.abort();
  }
  pronunciationLoading.value = true;
  const controller = new AbortController();
  pronunciationController.value = controller;
  const onFinish = () => {
    if (pronunciationController.value === controller) {
      pronunciationController.value = null;
    }
    pronunciationLoading.value = false;
  };
  const onStart = () => {
    pronunciationLoading.value = false;
  };
  const doPlay = (provider) => {
    if (provider === "browser") {
      speak({
        text: word,
        lang: "en-US",
        rate: 0.9,
        volume: 1,
        signal: controller.signal,
        onStart,
        onFinish,
      });
      return;
    }
    playWithDoubao({
      text: word,
      rate: 0.9,
      volume: 1,
      signal: controller.signal,
      onStart,
      onFinish,
      onFallback: () => {
        speak({
          text: word,
          lang: "en-US",
          rate: 0.9,
          volume: 1,
          signal: controller.signal,
          onStart,
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

function playExample(exampleText, index) {
  const raw = (exampleText || "").trim();
  const text = raw.replace(/\*\*([^*]*)\*\*/g, "$1").trim();
  if (!text) return;
  if (exampleController.value) {
    exampleController.value.abort();
  }
  exampleLoadingIndex.value = index;
  const controller = new AbortController();
  exampleController.value = controller;
  const onFinish = () => {
    if (exampleController.value === controller) {
      exampleController.value = null;
    }
    exampleLoadingIndex.value = null;
  };
  const onStart = () => {
    exampleLoadingIndex.value = null;
  };
  const doPlay = (provider) => {
    if (provider === "browser") {
      speak({
        text,
        lang: "en-US",
        rate: 0.9,
        volume: 1,
        signal: controller.signal,
        onStart,
        onFinish,
      });
      return;
    }
    playWithDoubao({
      text,
      rate: 0.9,
      volume: 1,
      signal: controller.signal,
      onStart,
      onFinish,
      onFallback: () => {
        speak({
          text,
          lang: "en-US",
          rate: 0.9,
          volume: 1,
          signal: controller.signal,
          onStart,
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
.composer_view {
  display: grid;
  gap: 12px;
  min-height: 360px;
}

.composer_editor {
  min-height: 272px;
  border: 1px solid #eef1f4;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}

.composer_textarea {
  width: 100%;
  min-height: 272px;
  padding: 18px 16px;
  border: none;
  outline: none;
  resize: none;
  font: inherit;
  font-size: 14px;
  line-height: 1.7;
  color: #1f2937;
  background: transparent;
  box-sizing: border-box;
}

.composer_textarea::placeholder {
  color: #cbd5e1;
}

.composer_error {
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff1f2;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
}

.composer_actions {
  display: grid;
  gap: 12px;
}

.composer_primary_btn,
.composer_secondary_btn {
  border: 1px solid #d9dde5;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.composer_primary_btn {
  width: 100%;
  min-height: 52px;
  border-color: #111827;
  background: #111827;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.composer_secondary_actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.composer_secondary_btn {
  min-height: 50px;
  background: #fff;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
}

.composer_primary_btn:hover:not(:disabled),
.composer_secondary_btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
}

.composer_primary_btn:disabled,
.composer_secondary_btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn_icon {
  font-size: 15px;
  font-weight: 600;
}

.btn_icon_blue {
  color: #5b6df6;
}

.btn_icon_green {
  color: #4bb46a;
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

    .speaker_icon_wrap {
      width: 14px;
      height: 14px;
      font-size: 14px;
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

        .example_speaker_icon_wrap {
          width: 0.75em;
          height: 0.75em;
          font-size: 0.75em;
        }
      }
    }

    .entry_example_translation {
      margin: 0;
      padding-left: calc(1.5em + 6px);
      color: #6b7280;
      font-size: 12px;
    }
  }
}

.sentence_view {
  .sentence_error,
  .sentence_loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    color: #666;
    font-size: 14px;
  }

  .sentence_error {
    color: #f56c6c;
  }

  .translation_row {
    margin: 4px 0 2px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .translation_text {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a1a;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .sentence_actions {
    display: flex;
    justify-content: flex-end;
  }

  .sentence_button_group {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .sentence_actions .action_btn {
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

    .action_icon {
      width: 14px;
      height: 14px;
      display: block;
    }

    &:hover:not(:disabled) {
      background: #d1d5db;
      color: #374151;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
