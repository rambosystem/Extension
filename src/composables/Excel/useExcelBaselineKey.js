import { ref, watch, onMounted, onUnmounted } from "vue";
import { useSettings } from "../Core/useSettings.js";

export function useExcelBaselineKey() {
  const { excelBaselineKey, handleSaveExcelBaselineKey } = useSettings();

  const excelBaselineKeyEditing = ref(false);
  const isSaving = ref(false);

  // excelBaselineKey变动时，设置excelBaselineKeyEditing为true，空值时设置为false
  watch(
    () => excelBaselineKey.value,
    (newValue) => {
      // 有值时显示按钮，空值时隐藏按钮
      if (newValue && newValue.trim()) {
        excelBaselineKeyEditing.value = true;
      } else {
        excelBaselineKeyEditing.value = false;
      }
    }
  );

  const handleExcelBaselineKeySave = () => {
    if (!excelBaselineKeyEditing.value) return;

    const currentValue = excelBaselineKey.value || "";

    // 检查是否为空
    if (!currentValue.trim()) {
      return false;
    }

    isSaving.value = true;

    const success = handleSaveExcelBaselineKey(currentValue);
    if (success) {
      excelBaselineKeyEditing.value = false;
    }

    isSaving.value = false;
    return success;
  };

  const handleExcelBaselineKeyFocus = () => {
    excelBaselineKeyEditing.value = true;
  };

  const handleExcelBaselineKeyCancel = () => {
    // 如果正在保存，不处理失焦
    if (isSaving.value) return;

    // 延迟处理，给用户时间点击保存按钮
    setTimeout(() => {
      if (excelBaselineKeyEditing.value && !isSaving.value) {
        // 失焦时清空值并隐藏按钮
        excelBaselineKey.value = "";
        excelBaselineKeyEditing.value = false;
      }
    }, 200);
  };

  const handleExcelBaselineKeyClear = () => {
    excelBaselineKey.value = "";
    excelBaselineKeyEditing.value = false;
    // 清空存储
    handleSaveExcelBaselineKey("");
  };

  // 监听baseline key清空事件
  const handleBaselineKeyCleared = () => {
    excelBaselineKey.value = "";
    excelBaselineKeyEditing.value = false;
  };

  // 组件挂载时添加事件监听
  onMounted(() => {
    window.addEventListener("baselineKeyCleared", handleBaselineKeyCleared);
  });

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener("baselineKeyCleared", handleBaselineKeyCleared);
  });

  return {
    excelBaselineKey,
    excelBaselineKeyEditing,
    isSaving,
    handleExcelBaselineKeySave,
    handleExcelBaselineKeyFocus,
    handleExcelBaselineKeyCancel,
    handleExcelBaselineKeyClear,
  };
}
