import { ref, nextTick } from "vue";
import { autocompleteKeys } from "../../requests/autocomplete.js";
import { debugLog, debugError } from "../../utils/debug.js";

/**
 * 自动补全功能 Composable
 * 提供代码补全样式的自动补全功能
 */
export function useAutocomplete(options = {}) {
  const {
    fetchSuggestions = null, // 自定义获取建议的函数
    debounce = 300, // 防抖延迟
    defaultProjectId = "2582110965ade9652de217.13653519", // 默认项目ID
    getProjectId = null, // 自定义获取项目ID的函数
  } = options;

  // 状态
  const suggestionText = ref("");
  const fullSuggestion = ref("");
  const suggestionStyle = ref({});

  // 内部状态
  let autocompleteTimer = null;
  let currentQueryId = 0;
  let measureRef = null;

  /**
   * 更新建议文本的位置
   */
  const updateSuggestionPosition = (inputValue) => {
    nextTick(() => {
      if (measureRef && suggestionText.value && inputValue) {
        const width = measureRef.offsetWidth;
        suggestionStyle.value = {
          left: `${12 + width}px`,
        };
        debugLog("[Autocomplete] Suggestion position updated:", width);
      } else {
        suggestionStyle.value = {};
      }
    });
  };

  /**
   * 设置测量元素引用
   */
  const setMeasureRef = (ref) => {
    measureRef = ref;
  };

  /**
   * 获取自动补全建议（默认实现）
   */
  const defaultFetchSuggestions = async (queryString, projectId) => {
    try {
      debugLog("[Autocomplete] Calling API with:", {
        projectId,
        query: queryString.trim(),
        limit: 1,
      });

      const response = await autocompleteKeys(projectId, queryString.trim(), 1);

      debugLog("[Autocomplete] API response:", response);

      // 获取第一条建议
      const firstResult = response?.results?.[0];
      if (firstResult && firstResult.key_name) {
        return firstResult.key_name;
      }
      return null;
    } catch (error) {
      debugError("[Autocomplete] Error occurred:", error);
      return null;
    }
  };

  /**
   * 获取自动补全建议
   */
  const fetchAutocompleteSuggestion = async (
    queryString,
    queryId,
    currentValue
  ) => {
    // 再次检查输入是否仍然有效
    if (
      !queryString ||
      !queryString.trim() ||
      currentValue.trim() !== queryString.trim()
    ) {
      debugLog(
        "[Autocomplete] Query invalidated, current value:",
        currentValue
      );
      suggestionText.value = "";
      return;
    }

    // 获取项目ID
    let projectId = defaultProjectId;
    if (getProjectId) {
      projectId = getProjectId() || defaultProjectId;
    }

    debugLog(
      "[Autocomplete] Query started:",
      queryString,
      "Query ID:",
      queryId
    );
    debugLog("[Autocomplete] Project ID:", projectId);

    // 使用自定义函数或默认实现
    const fetchFn = fetchSuggestions || defaultFetchSuggestions;
    const suggestion = await fetchFn(queryString, projectId);

    // 再次验证查询是否仍然有效
    if (queryId !== currentQueryId) {
      debugLog("[Autocomplete] Query outdated after API call, ignoring result");
      suggestionText.value = "";
      return;
    }

    if (suggestion) {
      const query = queryString.trim();
      // 只显示用户还未输入的部分
      if (suggestion.startsWith(query)) {
        fullSuggestion.value = suggestion;
        suggestionText.value = suggestion.substring(query.length);
        debugLog("[Autocomplete] Full suggestion:", suggestion);
        debugLog("[Autocomplete] Displaying suffix:", suggestionText.value);
      } else {
        suggestionText.value = "";
        fullSuggestion.value = "";
      }
    } else {
      suggestionText.value = "";
      fullSuggestion.value = "";
      debugLog("[Autocomplete] No suggestion found");
    }
  };

  /**
   * 处理输入事件
   */
  const handleInput = (value, onUpdate) => {
    // 清除之前的定时器
    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer);
    }

    // 如果输入为空，立即清除建议文本
    if (!value || !value.trim()) {
      suggestionText.value = "";
      fullSuggestion.value = "";
      currentQueryId++;
      updateSuggestionPosition("");
      return;
    }

    // 检查当前输入是否仍然匹配建议的前缀
    if (fullSuggestion.value && suggestionText.value) {
      const currentPrefix = value.trim();
      // 如果完整建议不再以当前输入开头，清除建议
      if (!fullSuggestion.value.startsWith(currentPrefix)) {
        suggestionText.value = "";
        fullSuggestion.value = "";
        debugLog("[Autocomplete] Input no longer matches suggestion, clearing");
      } else {
        // 如果仍然匹配，更新建议后缀
        suggestionText.value = fullSuggestion.value.substring(
          currentPrefix.length
        );
      }
    }

    // 如果输入值已完全匹配建议，清空建议
    if (suggestionText.value && value === fullSuggestion.value) {
      suggestionText.value = "";
      fullSuggestion.value = "";
      updateSuggestionPosition(value);
      return;
    }

    // 更新位置
    updateSuggestionPosition(value);

    // 生成新的查询ID
    const queryId = ++currentQueryId;

    // 防抖：延迟后获取建议
    autocompleteTimer = setTimeout(() => {
      fetchAutocompleteSuggestion(value, queryId, value).then(() => {
        // API返回后更新位置
        updateSuggestionPosition(value);
      });
    }, debounce);
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (event, currentValue, onUpdate) => {
    // Tab 或 Right Arrow 键：接受建议
    if (event.key === "Tab" || event.key === "ArrowRight") {
      if (suggestionText.value) {
        event.preventDefault();
        // 清除防抖定时器，避免后续API调用显示建议
        if (autocompleteTimer) {
          clearTimeout(autocompleteTimer);
          autocompleteTimer = null;
        }
        // 使正在进行的查询失效
        currentQueryId++;
        // 将完整的建议设置到输入框
        const newValue = currentValue + suggestionText.value;
        if (onUpdate) {
          onUpdate(newValue);
        }
        suggestionText.value = "";
        fullSuggestion.value = "";
        debugLog("[Autocomplete] Accepted suggestion via", event.key);
      }
    }
    // Escape 键：取消建议
    else if (event.key === "Escape") {
      // 清除防抖定时器
      if (autocompleteTimer) {
        clearTimeout(autocompleteTimer);
        autocompleteTimer = null;
      }
      suggestionText.value = "";
      fullSuggestion.value = "";
    }
  };

  /**
   * 清除建议
   */
  const clearSuggestion = () => {
    if (autocompleteTimer) {
      clearTimeout(autocompleteTimer);
      autocompleteTimer = null;
    }
    suggestionText.value = "";
    fullSuggestion.value = "";
    currentQueryId++;
  };

  return {
    // 状态
    suggestionText,
    suggestionStyle,

    // 方法
    handleInput,
    handleKeyDown,
    clearSuggestion,
    setMeasureRef,
    updateSuggestionPosition,
  };
}
