<template>
  <el-container class="popup_frame_container" direction="vertical">
    <el-header
      class="popup_header"
      :class="{ popup_header_draggable: onMoveBy }"
      @mousedown="onHeaderMouseDown"
    >
      <div class="header_icon header_drag_area">
        <img
          src="@/assets/icon.svg"
          class="logo_icon"
          draggable="false"
          alt="logo"
        />
      </div>
      <div class="header_button_group">
        <button
          v-if="showPin"
          type="button"
          class="header_btn pin_btn"
          :class="{ is_pinned: isPinned }"
          :title="isPinned ? 'Unpin' : 'Pin'"
          @click.stop="togglePin"
        >
          <img
            src="@/assets/fixed.svg"
            class="pin_icon_img"
            alt=""
            draggable="false"
          />
        </button>
        <button
          v-if="showSettings"
          type="button"
          class="header_btn setting_icon"
          :title="settingTitle"
          @click.stop="handleSettingClick"
        >
          <img
            src="@/assets/more_field.svg"
            class="setting_icon_img"
            alt=""
            draggable="false"
          />
        </button>
        <button
          type="button"
          class="header_btn close_icon"
          title="Close"
          @click="onClose"
        >
          <el-icon :size="20">
            <Close />
          </el-icon>
        </button>
      </div>
    </el-header>
    <el-main class="popup_main">
      <slot />
    </el-main>
  </el-container>
</template>

<script setup>
import { Close } from "@element-plus/icons-vue";
import { computed, isRef, unref } from "vue";

const props = defineProps({
  onClose: { type: Function, required: true },
  /** 是否显示固定按钮（拖拽、固定、Setting 三者独立配置） */
  showPin: { type: Boolean, default: false },
  /** 是否显示 Setting 按钮 */
  showSettings: { type: Boolean, default: false },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  /** 提供则头部可拖拽 */
  onMoveBy: { type: Function, default: null },
  /** Setting 点击回调，若未提供则用 settingRoute 打开选项页 */
  onSettingClick: { type: Function, default: null },
  /** Setting 路由：打开选项页时定位的菜单 index（如 "2"=Translate "3"=Settings），与 onSettingClick 二选一 */
  settingRoute: { type: String, default: "" },
  settingTitle: { type: String, default: "Settings" },
});

const isPinned = computed(() =>
  props.pinned != null ? unref(props.pinned) : false,
);

function togglePin() {
  const next = !unref(props.pinned);
  if (isRef(props.pinned)) props.pinned.value = next;
  props.setPinned?.(next);
}

function handleSettingClick() {
  if (props.onSettingClick) {
    props.onSettingClick();
    return;
  }
  if (props.settingRoute && typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS", menu: props.settingRoute });
  }
}

let dragStartX = 0;
let dragStartY = 0;
function onHeaderMouseDown(e) {
  if (e.target.closest("button")) return;
  if (!props.onMoveBy) return;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const onMouseMove = (e2) => {
    const dx = e2.clientX - dragStartX;
    const dy = e2.clientY - dragStartY;
    dragStartX = e2.clientX;
    dragStartY = e2.clientY;
    props.onMoveBy?.(dx, dy);
  };
  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}
</script>

<style scoped lang="scss">
.popup_frame_container {
  width: 320px;
  min-height: auto;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.popup_header {
  flex-shrink: 0;
  height: 44px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
  user-select: none;

  .header_drag_area {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &.popup_header_draggable:hover {
    cursor: move;
  }

  .header_icon {
    flex: 0 0 auto;
    height: 20px;
    width: auto;
  }

  .logo_icon {
    height: 100%;
    width: auto;
    object-fit: contain;
  }

  .header_button_group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .header_btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #666;
    cursor: pointer;

    &:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .pin_icon_img,
    .setting_icon_img {
      width: 20px;
      height: 20px;
      display: block;
    }
  }

  .pin_btn.is_pinned {
    background: #e5e7eb;
    color: #374151;
  }
}

.popup_main {
  padding: 12px;
  overflow-y: auto;
}
</style>
