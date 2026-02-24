<template>
  <PopupFrame
    :on-close="onClose"
    show-pin
    show-settings
    setting-title="Settings"
    :setting-route="ROUTE_INDEX.CLIPBOARD"
    :pinned="pinned"
    :set-pinned="setPinned"
    :on-move-by="onMoveBy"
  >
    <div class="clipboard_view">
      <div class="clipboard_title">Clipboard</div>
      <p class="clipboard_placeholder">Clipboard content will appear here.</p>
    </div>
  </PopupFrame>
</template>

<script setup>
import PopupFrame from "@/Components/PopupFrame.vue";
import { ROUTE_INDEX } from "@/routes/constants.js";

defineProps({
  onClose: { type: Function, required: true },
  pinned: { type: [Object, Boolean], default: null },
  setPinned: { type: Function, default: null },
  onMoveBy: { type: Function, default: null },
});
</script>

<style scoped lang="scss">
.clipboard_view {
  .clipboard_title {
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
    margin-bottom: 8px;
  }

  .clipboard_placeholder {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }
}
</style>
