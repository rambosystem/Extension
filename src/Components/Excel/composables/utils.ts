/**
 * Excel 组件工具函数
 * 提供防抖、节流等性能优化工具
 */

/**
 * 防抖函数
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数（使用 requestAnimationFrame 优化）
 * @param fn - 要节流的函数
 * @returns 节流后的函数
 */
export function throttleRAF<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn.apply(this, args);
        rafId = null;
      });
    }
  };
}

/**
 * 节流函数（使用时间戳）
 * @param fn - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 16
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * DOM 查询缓存
 * 缓存单元格 DOM 元素引用，避免重复查询
 */
export class CellElementCache {
  private cache = new Map<string, HTMLElement | null>();
  private container: HTMLElement | null = null;

  /**
   * 设置容器元素
   */
  setContainer(container: HTMLElement | null): void {
    this.container = container;
    this.clear(); // 容器变化时清空缓存
  }

  /**
   * 获取单元格元素（带缓存）
   */
  getCellElement(row: number, col: number): HTMLElement | null {
    if (!this.container) return null;

    const key = `${row}-${col}`;
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      // 验证缓存是否仍然有效
      if (cached && this.container.contains(cached)) {
        return cached;
      }
      // 缓存失效，移除
      this.cache.delete(key);
    }

    // 查询 DOM
    const element = this.container.querySelector(
      `.excel-cell[data-row="${row}"][data-col="${col}"]`
    ) as HTMLElement | null;

    // 缓存结果（包括 null）
    this.cache.set(key, element);
    return element;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 移除指定单元格的缓存
   */
  invalidate(row: number, col: number): void {
    const key = `${row}-${col}`;
    this.cache.delete(key);
  }
}
