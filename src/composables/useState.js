import { reactive, ref, computed } from "vue";

/**
 * 通用状态管理 Hook
 * 支持多种状态类型：loading、boolean、string、object 等
 */
export function useState(initialStates = {}) {
  // 分离不同类型的初始状态
  const loadingStates = reactive({});
  const booleanStates = reactive({});
  const stringStates = reactive({});
  const objectStates = reactive({});
  const refStates = {};

  // 初始化状态
  Object.entries(initialStates).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      // 布尔值状态（包括 loading 状态）
      if (key.includes('loading') || key.includes('Loading')) {
        loadingStates[key] = value;
      } else {
        booleanStates[key] = value;
      }
    } else if (typeof value === 'string') {
      stringStates[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      objectStates[key] = value;
    } else {
      // 其他类型使用 ref
      refStates[key] = ref(value);
    }
  });

  /**
   * 设置状态值
   * @param {string} key - 状态键
   * @param {any} value - 状态值
   * @param {string} type - 状态类型 ('loading', 'boolean', 'string', 'object', 'ref')
   */
  const setState = (key, value, type = 'auto') => {
    if (type === 'auto') {
      // 自动判断类型
      if (key.includes('loading') || key.includes('Loading')) {
        loadingStates[key] = value;
      } else if (typeof value === 'boolean') {
        booleanStates[key] = value;
      } else if (typeof value === 'string') {
        stringStates[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        objectStates[key] = value;
      } else {
        refStates[key] = ref(value);
      }
    } else {
      // 指定类型
      switch (type) {
        case 'loading':
          loadingStates[key] = value;
          break;
        case 'boolean':
          booleanStates[key] = value;
          break;
        case 'string':
          stringStates[key] = value;
          break;
        case 'object':
          objectStates[key] = value;
          break;
        case 'ref':
          if (!refStates[key]) {
            refStates[key] = ref(value);
          } else {
            refStates[key].value = value;
          }
          break;
      }
    }
  };

  /**
   * 获取状态值
   * @param {string} key - 状态键
   * @param {string} type - 状态类型
   * @returns {any} 状态值
   */
  const getState = (key, type = 'auto') => {
    if (type === 'auto') {
      // 自动查找
      if (key in loadingStates) return loadingStates[key];
      if (key in booleanStates) return booleanStates[key];
      if (key in stringStates) return stringStates[key];
      if (key in objectStates) return objectStates[key];
      if (key in refStates) return refStates[key].value;
      return undefined;
    } else {
      // 指定类型
      switch (type) {
        case 'loading':
          return loadingStates[key];
        case 'boolean':
          return booleanStates[key];
        case 'string':
          return stringStates[key];
        case 'object':
          return objectStates[key];
        case 'ref':
          return refStates[key]?.value;
        default:
          return undefined;
      }
    }
  };

  /**
   * 批量设置状态
   * @param {Object} states - 状态对象
   * @param {string} type - 状态类型
   */
  const setStates = (states, type = 'auto') => {
    Object.entries(states).forEach(([key, value]) => {
      setState(key, value, type);
    });
  };

  /**
   * 批量获取状态
   * @param {string[]} keys - 状态键数组
   * @param {string} type - 状态类型
   * @returns {Object} 状态对象
   */
  const getStates = (keys, type = 'auto') => {
    const result = {};
    keys.forEach(key => {
      result[key] = getState(key, type);
    });
    return result;
  };

  /**
   * 重置所有状态
   * @param {string} type - 状态类型，不指定则重置所有
   */
  const resetStates = (type) => {
    if (!type) {
      // 重置所有状态
      Object.keys(loadingStates).forEach(key => {
        loadingStates[key] = false;
      });
      Object.keys(booleanStates).forEach(key => {
        booleanStates[key] = false;
      });
      Object.keys(stringStates).forEach(key => {
        stringStates[key] = '';
      });
      Object.keys(refStates).forEach(key => {
        refStates[key].value = null;
      });
    } else {
      // 重置指定类型
      switch (type) {
        case 'loading':
          Object.keys(loadingStates).forEach(key => {
            loadingStates[key] = false;
          });
          break;
        case 'boolean':
          Object.keys(booleanStates).forEach(key => {
            booleanStates[key] = false;
          });
          break;
        case 'string':
          Object.keys(stringStates).forEach(key => {
            stringStates[key] = '';
          });
          break;
        case 'ref':
          Object.keys(refStates).forEach(key => {
            refStates[key].value = null;
          });
          break;
      }
    }
  };

  /**
   * 异步操作包装器（类似原来的 withLoading）
   * @param {string} key - 状态键
   * @param {Function} asyncFn - 异步函数
   * @param {string} type - 状态类型，默认为 'loading'
   */
  const withState = async (key, asyncFn, type = 'loading') => {
    try {
      setState(key, true, type);
      await asyncFn();
    } finally {
      setState(key, false, type);
    }
  };

  /**
   * 检查是否有任何 loading 状态为 true
   * @returns {boolean}
   */
  const isAnyLoading = () => {
    return Object.values(loadingStates).some(state => state === true);
  };

  /**
   * 计算属性：获取所有状态
   */
  const allStates = computed(() => ({
    ...loadingStates,
    ...booleanStates,
    ...stringStates,
    ...objectStates,
    ...Object.fromEntries(
      Object.entries(refStates).map(([key, ref]) => [key, ref.value])
    )
  }));

  return {
    // 状态对象
    loadingStates,
    booleanStates,
    stringStates,
    objectStates,
    refStates,
    allStates,

    // 方法
    setState,
    getState,
    setStates,
    getStates,
    resetStates,
    withState,
    isAnyLoading,

    // 兼容性方法（保持与 useLoading 的兼容）
    setLoading: (key, value) => setState(key, value, 'loading'),
    withLoading: (key, asyncFn) => withState(key, asyncFn, 'loading'),
    resetAllLoading: () => resetStates('loading'),
  };
} 