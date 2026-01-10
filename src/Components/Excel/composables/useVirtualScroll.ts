import { ref, computed, onUnmounted, watch, type Ref } from "vue";
import { throttleRAF } from "./utils";

/**
 * 虚拟滚动配置
 */
export interface VirtualScrollConfig {
  /**
   * 启用虚拟滚动的行数阈值
   * 当行数超过此值时，自动启用虚拟滚动
   */
  threshold?: number;
  /**
   * 可见区域外的缓冲区行数
   * 用于预渲染，提升滚动体验
   */
  bufferSize?: number;
  /**
   * 默认行高（用于计算总高度）
   */
  defaultRowHeight?: number;
}

/**
 * 虚拟滚动返回值
 */
export interface UseVirtualScrollReturn {
  /**
   * 可见行的起始索引
   */
  startIndex: Ref<number>;
  /**
   * 可见行的结束索引
   */
  endIndex: Ref<number>;
  /**
   * 可见行范围
   */
  visibleRange: Ref<{ start: number; end: number }>;
  /**
   * 是否启用虚拟滚动
   */
  enabled: Ref<boolean>;
  /**
   * 上方占位符高度（px）
   */
  offsetTop: Ref<number>;
  /**
   * 下方占位符高度（px）
   */
  offsetBottom: Ref<number>;
  /**
   * 总高度（px）
   */
  totalHeight: Ref<number>;
  /**
   * 初始化虚拟滚动
   */
  init: (
    container: HTMLElement,
    getRowHeight: (index: number) => number
  ) => void;
  /**
   * 更新可见区域
   */
  updateVisibleRange: () => void;
  /**
   * 滚动到指定行
   */
  scrollToRow: (rowIndex: number) => void;
  /**
   * 清理
   */
  cleanup: () => void;
}

/**
 * 虚拟滚动 Composable
 *
 * 性能优化：
 * - 只渲染可见区域的单元格
 * - 使用占位符保持滚动条正确
 * - 支持缓冲区预渲染
 * - 使用 requestAnimationFrame 优化滚动性能
 */
export function useVirtualScroll(
  totalRows: Ref<number>,
  config: VirtualScrollConfig = {}
): UseVirtualScrollReturn {
  const {
    threshold = 100, // 默认超过 100 行启用虚拟滚动
    bufferSize = 5, // 默认缓冲区 5 行
    defaultRowHeight: _defaultRowHeight = 36, // 默认行高（当前未使用，保留用于未来扩展）
  } = config;

  const enabled = computed(() => totalRows.value > threshold);
  const startIndex = ref(0);
  const endIndex = ref(0);
  const offsetTop = ref(0);
  const offsetBottom = ref(0);
  const totalHeight = ref(0);

  let container: HTMLElement | null = null;
  let getRowHeight: ((index: number) => number) | null = null;
  let scrollHandler: (() => void) | null = null;
  let resizeObserver: ResizeObserver | null = null;

  /**
   * 计算可见行范围
   */
  const calculateVisibleRange = (): { start: number; end: number } => {
    if (!enabled.value || !container || !getRowHeight) {
      return { start: 0, end: totalRows.value - 1 };
    }

    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const containerHeight = containerRect.height;

    // 计算可见区域的起始和结束位置
    let currentTop = 0;
    let start = 0;
    let end = totalRows.value - 1;

    // 找到起始行
    for (let i = 0; i < totalRows.value; i++) {
      const rowHeight = getRowHeight(i);
      const nextTop = currentTop + rowHeight;

      if (nextTop > scrollTop) {
        start = Math.max(0, i - bufferSize);
        break;
      }

      currentTop = nextTop;
    }

    // 找到结束行
    const visibleBottom = scrollTop + containerHeight;
    currentTop = 0;

    for (let i = 0; i < totalRows.value; i++) {
      const rowHeight = getRowHeight(i);
      currentTop += rowHeight;

      if (currentTop >= visibleBottom) {
        end = Math.min(totalRows.value - 1, i + bufferSize);
        break;
      }
    }

    return { start, end };
  };

  /**
   * 更新可见区域
   */
  const updateVisibleRange = (): void => {
    if (!enabled.value) {
      startIndex.value = 0;
      endIndex.value = totalRows.value - 1;
      offsetTop.value = 0;
      offsetBottom.value = 0;
      totalHeight.value = 0;
      return;
    }

    const range = calculateVisibleRange();
    startIndex.value = range.start;
    endIndex.value = range.end;

    // 计算上方占位符高度
    if (getRowHeight) {
      let topHeight = 0;
      for (let i = 0; i < range.start; i++) {
        topHeight += getRowHeight(i);
      }
      offsetTop.value = topHeight;

      // 计算下方占位符高度
      let bottomHeight = 0;
      for (let i = range.end + 1; i < totalRows.value; i++) {
        bottomHeight += getRowHeight(i);
      }
      offsetBottom.value = bottomHeight;

      // 计算总高度
      let total = 0;
      for (let i = 0; i < totalRows.value; i++) {
        total += getRowHeight(i);
      }
      totalHeight.value = total;
    }
  };

  /**
   * 节流版本的更新函数
   */
  const throttledUpdate = throttleRAF(updateVisibleRange);

  /**
   * 初始化虚拟滚动
   */
  const init = (
    containerElement: HTMLElement,
    rowHeightGetter: (index: number) => number
  ): void => {
    container = containerElement;
    getRowHeight = rowHeightGetter;

    // 创建滚动处理函数
    scrollHandler = () => {
      throttledUpdate();
    };

    // 监听滚动事件
    container.addEventListener("scroll", scrollHandler, { passive: true });

    // 使用 ResizeObserver 监听容器大小变化
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        throttledUpdate();
      });
      resizeObserver.observe(container);
    }

    // 初始更新
    updateVisibleRange();
  };

  /**
   * 滚动到指定行
   */
  const scrollToRow = (rowIndex: number): void => {
    if (!enabled.value || !container || !getRowHeight) {
      return;
    }

    // 计算目标行的位置
    let targetTop = 0;
    for (let i = 0; i < rowIndex && i < totalRows.value; i++) {
      targetTop += getRowHeight(i);
    }

    // 滚动到目标位置
    container.scrollTop = targetTop;
    updateVisibleRange();
  };

  /**
   * 清理
   */
  const cleanup = (): void => {
    if (container && scrollHandler) {
      container.removeEventListener("scroll", scrollHandler);
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    container = null;
    getRowHeight = null;
    scrollHandler = null;
  };

  // 监听行数变化
  watch(totalRows, () => {
    if (enabled.value) {
      updateVisibleRange();
    }
  });

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup();
  });

  const visibleRange = computed(() => ({
    start: startIndex.value,
    end: endIndex.value,
  }));

  return {
    startIndex,
    endIndex,
    visibleRange,
    enabled,
    offsetTop,
    offsetBottom,
    totalHeight,
    init,
    updateVisibleRange,
    scrollToRow,
    cleanup,
  };
}
