import { ref, nextTick } from "vue";
import { autocompleteKeys } from "../../services/autocomplete/autocompleteService.js";
import { debugLog, debugError } from "../../utils/debug.js";

/**
 * 自动补全功能 Composable
 * 提供代码补全样式的自动补全功能
 */
export function useAutocomplete(options = {}) {
  const {
    fetchSuggestions = null, // 自定义获取建议的函数
    fetchSuggestionsList = null, // 自定义获取建议列表的函数（用于下拉菜单）
    debounce = 300, // 防抖延迟
    defaultProjectId = null, // 默认项目ID（全局统一使用 Default Project 的值）
    getProjectId = null, // 自定义获取项目ID的函数
    showDropdown = false, // 是否显示下拉菜单
    dropdownLimit = 10, // 下拉菜单显示的最大结果数
  } = options;

  // 状态
  const suggestionText = ref("");
  const fullSuggestion = ref("");
  const suggestionStyle = ref({});
  const dropdownSuggestions = ref([]); // 下拉菜单建议列表
  const showDropdownMenu = ref(false); // 是否显示下拉菜单
  const selectedIndex = ref(-1); // 当前选中的下拉菜单项索引

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
          left: `${11 + width}px`,
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
   * 将 key +1（如 key1 -> key2）
   */
  const incrementKey = (key) => {
    const match = key.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) {
      return key; // 如果格式不正确，返回原值
    }
    const [, prefix, numberStr] = match;
    const currentNumber = parseInt(numberStr, 10);
    const newNumber = currentNumber + 1;
    return `${prefix}${newNumber}`;
  };

  /**
   * 获取自动补全建议（默认实现）
   * 从接口获取到 key 后，自动将其 +1 再返回
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
        const originalKey = firstResult.key_name;
        // 从接口获取到的 key 直接 +1
        const incrementedKey = incrementKey(originalKey);
        debugLog(
          "[Autocomplete] Incremented key:",
          originalKey,
          "->",
          incrementedKey
        );
        return incrementedKey;
      }
      return null;
    } catch (error) {
      debugError("[Autocomplete] Error occurred:", error);
      return null;
    }
  };

  /**
   * 获取自动补全建议列表（用于下拉菜单）
   * 返回多个建议结果，不进行+1操作
   */
  const defaultFetchSuggestionsList = async (
    queryString,
    projectId,
    limit = 10
  ) => {
    try {
      debugLog("[Autocomplete] Calling API for dropdown with:", {
        projectId,
        query: queryString.trim(),
        limit,
      });

      const response = await autocompleteKeys(
        projectId,
        queryString.trim(),
        limit
      );

      debugLog("[Autocomplete] API response for dropdown:", response);

      // 返回所有结果的key_name列表
      if (response?.results && Array.isArray(response.results)) {
        const suggestions = response.results
          .map((result) => result.key_name)
          .filter((key) => key); // 过滤掉空值
        debugLog("[Autocomplete] Dropdown suggestions:", suggestions);
        return suggestions;
      }
      return [];
    } catch (error) {
      debugError("[Autocomplete] Error occurred fetching dropdown:", error);
      return [];
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
      if (showDropdown) {
        dropdownSuggestions.value = [];
        showDropdownMenu.value = false;
      }
      return;
    }

    // 获取项目ID（全局统一使用 Default Project 的值）
    let projectId = null;
    if (getProjectId) {
      projectId = getProjectId();
    } else if (defaultProjectId) {
      projectId = defaultProjectId;
    }

    // 如果没有项目ID，不进行自动补全
    if (!projectId) {
      debugLog("[Autocomplete] No project ID available, skipping autocomplete");
      suggestionText.value = "";
      if (showDropdown) {
        dropdownSuggestions.value = [];
        showDropdownMenu.value = false;
      }
      return;
    }

    debugLog(
      "[Autocomplete] Query started:",
      queryString,
      "Query ID:",
      queryId
    );
    debugLog("[Autocomplete] Project ID:", projectId);

    // 如果启用下拉菜单，获取建议列表
    if (showDropdown) {
      const fetchListFn = fetchSuggestionsList || defaultFetchSuggestionsList;
      const suggestions = await fetchListFn(
        queryString,
        projectId,
        dropdownLimit
      );

      // 再次验证查询是否仍然有效
      if (queryId !== currentQueryId) {
        debugLog(
          "[Autocomplete] Query outdated after API call, ignoring result"
        );
        dropdownSuggestions.value = [];
        showDropdownMenu.value = false;
        return;
      }

      dropdownSuggestions.value = suggestions;
      showDropdownMenu.value = suggestions.length > 0;
      selectedIndex.value = -1;

      // 如果有建议，设置第一个为内联建议
      // 如果提供了fetchSuggestions，使用它来获取内联建议（保持原有逻辑，如key会+1）
      // 否则直接使用下拉菜单的第一个建议（如tag不需要+1）
      if (suggestions.length > 0) {
        if (fetchSuggestions) {
          // 使用fetchSuggestions获取内联建议（会进行+1等处理）
          const fetchFn = fetchSuggestions;
          const suggestion = await fetchFn(queryString, projectId);

          // 再次验证查询是否仍然有效
          if (queryId !== currentQueryId) {
            suggestionText.value = "";
            fullSuggestion.value = "";
            return;
          }

          if (suggestion) {
            const query = queryString.trim();
            if (suggestion.startsWith(query)) {
              fullSuggestion.value = suggestion;
              suggestionText.value = suggestion.substring(query.length);
            } else {
              suggestionText.value = "";
              fullSuggestion.value = "";
            }
          } else {
            suggestionText.value = "";
            fullSuggestion.value = "";
          }
        } else {
          // 没有fetchSuggestions，直接使用第一个下拉建议（不进行+1处理）
          const firstSuggestion = suggestions[0];
          const query = queryString.trim();
          if (firstSuggestion.startsWith(query)) {
            fullSuggestion.value = firstSuggestion;
            suggestionText.value = firstSuggestion.substring(query.length);
          } else {
            suggestionText.value = "";
            fullSuggestion.value = "";
          }
        }
      } else {
        suggestionText.value = "";
        fullSuggestion.value = "";
      }
    } else {
      // 原有逻辑：只获取单个建议
      const fetchFn = fetchSuggestions || defaultFetchSuggestions;
      const suggestion = await fetchFn(queryString, projectId);

      // 再次验证查询是否仍然有效
      if (queryId !== currentQueryId) {
        debugLog(
          "[Autocomplete] Query outdated after API call, ignoring result"
        );
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

    // 如果输入为空，立即清除建议文本和下拉菜单
    if (!value || !value.trim()) {
      suggestionText.value = "";
      fullSuggestion.value = "";
      if (showDropdown) {
        dropdownSuggestions.value = [];
        showDropdownMenu.value = false;
        selectedIndex.value = -1;
      }
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
      if (showDropdown) {
        showDropdownMenu.value = false;
      }
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
    // 如果启用下拉菜单，处理下拉菜单的键盘导航
    if (
      showDropdown &&
      showDropdownMenu.value &&
      dropdownSuggestions.value.length > 0
    ) {
      // ArrowDown: 向下选择
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectedIndex.value = Math.min(
          selectedIndex.value + 1,
          dropdownSuggestions.value.length - 1
        );
        return;
      }
      // ArrowUp: 向上选择
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
        return;
      }
      // Enter: 选择当前项
      if (event.key === "Enter" && selectedIndex.value >= 0) {
        event.preventDefault();
        const selectedSuggestion =
          dropdownSuggestions.value[selectedIndex.value];
        if (onUpdate && selectedSuggestion) {
          onUpdate(selectedSuggestion);
        }
        dropdownSuggestions.value = [];
        showDropdownMenu.value = false;
        selectedIndex.value = -1;
        suggestionText.value = "";
        fullSuggestion.value = "";
        return;
      }
      // Escape: 关闭下拉菜单
      if (event.key === "Escape") {
        event.preventDefault();
        showDropdownMenu.value = false;
        selectedIndex.value = -1;
        return;
      }
    }

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
        if (showDropdown) {
          showDropdownMenu.value = false;
          selectedIndex.value = -1;
        }
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
      if (showDropdown) {
        showDropdownMenu.value = false;
        selectedIndex.value = -1;
      }
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
    if (showDropdown) {
      dropdownSuggestions.value = [];
      showDropdownMenu.value = false;
      selectedIndex.value = -1;
    }
    currentQueryId++;
  };

  /**
   * 选择下拉菜单项
   */
  const selectSuggestion = (suggestion, onUpdate) => {
    if (onUpdate && suggestion) {
      onUpdate(suggestion);
    }
    dropdownSuggestions.value = [];
    showDropdownMenu.value = false;
    selectedIndex.value = -1;
    suggestionText.value = "";
    fullSuggestion.value = "";
  };

  return {
    // 状态
    suggestionText,
    suggestionStyle,
    dropdownSuggestions,
    showDropdownMenu,
    selectedIndex,

    // 方法
    handleInput,
    handleKeyDown,
    clearSuggestion,
    setMeasureRef,
    updateSuggestionPosition,
    selectSuggestion,
  };
}
