import { debugError, debugLog } from "../../../../utils/debug.js";

/**
 * 优化的深拷贝实现
 * 优先级：结构化克隆（性能最佳）> 数组展开（快速）> JSON 序列化（兼容性）
 *
 * 注意：Vue 的响应式对象（Proxy）无法被 structuredClone 克隆，
 * 所以需要先转换为普通数组
 */
export const optimizedDeepCopy = <T>(data: T): T => {
  if (!data) {
    debugError("[History] optimizedDeepCopy: data is null or undefined", data);
    return data;
  }

  if (Array.isArray(data)) {
    try {
      if (
        data.every(
          (row) =>
            Array.isArray(row) && row.every((cell) => typeof cell === "string")
        )
      ) {
        const cloned = data.map((row) => {
          if (Array.isArray(row)) {
            return [...row];
          }
          return [];
        }) as T;
        if (!Array.isArray(cloned)) {
          throw new Error("Array map failed to return array");
        }
        return cloned;
      }
    } catch (error) {
      debugLog(
        "[History] optimizedDeepCopy: array spread failed, trying structuredClone",
        error
      );
    }

    if (typeof structuredClone !== "undefined") {
      try {
        const plainData = JSON.parse(JSON.stringify(data));
        const cloned = structuredClone(plainData);
        if (cloned === null || cloned === undefined) {
          throw new Error("structuredClone returned null/undefined");
        }
        return cloned;
      } catch (error) {
        debugLog(
          "[History] optimizedDeepCopy: structuredClone failed, trying JSON",
          error
        );
      }
    }
  }

  try {
    const cloned = JSON.parse(JSON.stringify(data));
    if (cloned === null || cloned === undefined) {
      throw new Error("JSON serialization returned null/undefined");
    }
    return cloned;
  } catch (error) {
    debugError("[History] optimizedDeepCopy: all methods failed", error);
    throw new Error(
      `Failed to deep copy data: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
