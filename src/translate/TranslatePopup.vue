<template>
  <div class="penrose-popup-inner">
    <el-button class="penrose-popup-close" text circle type="info" aria-label="Close" @click="handleClose">
      ×
    </el-button>
    <div class="penrose-popup-title">Translate</div>
    <div class="penrose-popup-text">{{ selectionText }}</div>
    <div class="penrose-popup-actions">
      <el-button type="primary" size="small" @click="copyToClipboard">
        Copy
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { useClipboard } from './composables/useClipboard.js';

const props = defineProps({
  selectionText: { type: String, default: '' },
  onClose: { type: Function, required: true },
});

const { copy } = useClipboard();

function copyToClipboard() {
  copy(props.selectionText);
}

function handleClose() {
  props.onClose();
}
</script>

<style scoped>
.penrose-popup-inner {
  position: relative;
  min-width: 200px;
  max-width: 360px;
}

.penrose-popup-close {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 24px;
  padding: 0;
  font-size: 18px;
  line-height: 1;
}

.penrose-popup-title {
  font-weight: 600;
  margin-bottom: 6px;
  padding-right: 28px;
  color: #666;
  font-size: 14px;
}

.penrose-popup-text {
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.penrose-popup-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
