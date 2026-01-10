/**
 * Excel 组件性能监控工具
 * 用于监控和优化组件性能
 */

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
  enabled: boolean;
  logThreshold: number; // 日志阈值（毫秒）
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private measurements: Map<string, number[]> = new Map();

  constructor(
    config: PerformanceConfig = { enabled: false, logThreshold: 16 }
  ) {
    this.config = config;
  }

  /**
   * 开始性能测量
   */
  start(label: string): () => void {
    if (!this.config.enabled) {
      return () => {}; // 返回空函数
    }

    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.record(label, duration);
    };
  }

  /**
   * 记录性能数据
   */
  private record(label: string, duration: number): void {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }

    const measurements = this.measurements.get(label)!;
    measurements.push(duration);

    // 只保留最近 100 次测量
    if (measurements.length > 100) {
      measurements.shift();
    }

    // 如果超过阈值，记录警告
    if (duration > this.config.logThreshold) {
      if (import.meta.env.DEV) {
        console.warn(
          `[Performance] ${label} took ${duration.toFixed(2)}ms (threshold: ${
            this.config.logThreshold
          }ms)`
        );
      }
    }
  }

  /**
   * 获取性能统计
   */
  getStats(label?: string): {
    label: string;
    count: number;
    avg: number;
    min: number;
    max: number;
  }[] {
    if (label) {
      const measurements = this.measurements.get(label);
      if (!measurements || measurements.length === 0) {
        return [];
      }

      return [
        {
          label,
          count: measurements.length,
          avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
          min: Math.min(...measurements),
          max: Math.max(...measurements),
        },
      ];
    }

    return Array.from(this.measurements.entries()).map(
      ([label, measurements]) => ({
        label,
        count: measurements.length,
        avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
        min: Math.min(...measurements),
        max: Math.max(...measurements),
      })
    );
  }

  /**
   * 清除所有性能数据
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * 启用/禁用性能监控
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

/**
 * 全局性能监控器实例
 * 默认禁用，可通过 setEnabled(true) 启用
 */
export const performanceMonitor = new PerformanceMonitor({
  enabled: false,
  logThreshold: 16, // 16ms = 60fps
});

/**
 * 性能测量装饰器（用于函数）
 *
 * 注意：当前未使用 label 参数，保留用于未来扩展
 */
export function measurePerformance(_label: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const stop = performanceMonitor.start(
        `${target.constructor.name}.${propertyKey}`
      );
      try {
        const result = originalMethod.apply(this, args);
        stop();
        return result;
      } catch (error) {
        stop();
        throw error;
      }
    };

    return descriptor;
  };
}
