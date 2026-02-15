/**
 * useTypewriterDisplay - 自上而下单槽位打字机
 * 按顺序逐字输出：音标 → 第 1 条（词性、释义、例句、例句译）→ 第 2 条 → …
 * 每 tick 只在「当前」未打完的槽位 +1 个字符。
 *
 * @param {() => { pronunciation: string, entries: Array }} getDisplayData
 * @param {() => any} getKey - 查词 key（如 selectionText），变化时重置
 * @param {{ charsPerMs?: number }} options
 * @returns {{ displayedPronunciation: Ref<string>, displayedEntries: Ref<Array<{ part_of_speech: string, meaning: string, example: string, example_translation: string }>> }}
 */

import { ref, onUnmounted } from "vue";

const FIELD_NAMES = ["part_of_speech", "meaning", "example", "example_translation"];

/**
 * 去掉 example 中的 ** 标识符，返回纯文本和高亮区间（用于打字机只打纯文本，展示时再按区间高亮）
 * @param {string} example
 * @returns {{ plain: string, ranges: Array<{ start: number, end: number }> }}
 */
export function stripHighlightMarkers(example) {
  const ranges = [];
  let plain = "";
  const re = /\*\*([^*]*)\*\*/g;
  let match;
  let lastEnd = 0;
  while ((match = re.exec(example)) !== null) {
    plain += example.slice(lastEnd, match.index);
    const start = plain.length;
    plain += match[1];
    ranges.push({ start, end: plain.length });
    lastEnd = match.index + match[0].length;
  }
  plain += example.slice(lastEnd);
  return { plain, ranges };
}

/** 将 data 压平为自上而下的槽位顺序：音标 → entry0 四字段 → entry1 四字段 → …；entry.example 已去 ** */
function flattenTargets(data, preprocessedEntries) {
  const pronunciation = (data?.pronunciation ?? "") || "";
  const entries = preprocessedEntries ?? data?.entries ?? [];
  const flat = [pronunciation];
  for (const e of entries) {
    for (const k of FIELD_NAMES) {
      flat.push((e && e[k]) || "");
    }
  }
  return flat;
}

/** 根据 flatTargets 和 flatLengths 还原 displayedPronunciation + displayedEntries；附上每条的 example_highlight_ranges */
function buildDisplayed(flatTargets, flatLengths, entryCount, highlightRangesPerEntry = []) {
  const pronunciation =
    flatTargets.length > 0
      ? flatTargets[0].slice(0, flatLengths[0] ?? 0)
      : "";
  const entries = [];
  for (let i = 0; i < entryCount; i++) {
    const base = 1 + i * FIELD_NAMES.length;
    entries.push({
      part_of_speech: (flatTargets[base] ?? "").slice(0, flatLengths[base] ?? 0),
      meaning: (flatTargets[base + 1] ?? "").slice(0, flatLengths[base + 1] ?? 0),
      example: (flatTargets[base + 2] ?? "").slice(0, flatLengths[base + 2] ?? 0),
      example_translation: (flatTargets[base + 3] ?? "").slice(
        0,
        flatLengths[base + 3] ?? 0
      ),
      example_highlight_ranges: highlightRangesPerEntry[i] ?? [],
    });
  }
  return { pronunciation, entries };
}

export function useTypewriterDisplay(getDisplayData, getKey, options = {}) {
  const charsPerMs = options.charsPerMs ?? 15;
  const displayedPronunciation = ref("");
  const displayedEntries = ref([]);

  let lastKey = Symbol("init");
  /** 与 flatten 顺序一致：每槽位当前已显示长度 */
  let flatLengths = [];

  function tick() {
    const key = getKey();
    if (key !== lastKey) {
      lastKey = key;
      flatLengths = [];
      displayedPronunciation.value = "";
      displayedEntries.value = [];
    }

    const data = getDisplayData();
    const rawEntries = data?.entries ?? [];
    const preprocessed = rawEntries.map((e) => {
      const { plain, ranges } = stripHighlightMarkers((e && e.example) || "");
      return { ...e, example: plain, _example_highlight_ranges: ranges };
    });
    const highlightRangesPerEntry = preprocessed.map((e) => e._example_highlight_ranges ?? []);
    const flatTargets = flattenTargets(data, preprocessed);
    const entryCount = (flatTargets.length - 1) / FIELD_NAMES.length;
    if (flatTargets.length === 0 || entryCount < 0 || !Number.isInteger(entryCount)) {
      displayedPronunciation.value = "";
      displayedEntries.value = [];
      return;
    }

    while (flatLengths.length < flatTargets.length) {
      flatLengths.push(0);
    }
    flatLengths = flatLengths.slice(0, flatTargets.length);

    const idx = flatLengths.findIndex((len, i) => len < (flatTargets[i] ?? "").length);
    if (idx !== -1) {
      flatLengths[idx]++;
    }

    const { pronunciation, entries } = buildDisplayed(
      flatTargets,
      flatLengths,
      entryCount,
      highlightRangesPerEntry
    );
    displayedPronunciation.value = pronunciation;
    displayedEntries.value = entries;
  }

  const intervalId = setInterval(tick, charsPerMs);
  onUnmounted(() => clearInterval(intervalId));

  return { displayedPronunciation, displayedEntries };
}
