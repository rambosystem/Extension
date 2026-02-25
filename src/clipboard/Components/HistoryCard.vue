<template>
  <el-card shadow="hover" class="history_card">
    <div class="history_content">
      <el-tooltip
        :content="item.text"
        placement="top-start"
        :show-after="200"
        :z-index="2147483600"
        :disabled="!item.text || !isOverflow"
        :popper-style="tooltipPopperStyle"
      >
        <p ref="textRef" class="history_text">
          {{ item.text }}
        </p>
      </el-tooltip>
    </div>
    <div class="history_footer">
      <span class="history_meta">{{ formattedTime }}</span>
      <div class="history_actions">
        <el-button size="small" @click="emit('copy', item)">
          {{ t("clipboard.copyButton") }}
        </el-button>
        <el-button size="small" type="danger" plain @click="emit('delete', item.id)">
          {{ t("common.delete") }}
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";

const props = defineProps({
  item: {
    type: Object,
    required: true,
    validator: (v) =>
      v != null &&
      typeof v.id === "string" &&
      typeof v.text === "string" &&
      (v.createdAt == null || typeof v.createdAt === "number"),
  },
});

const emit = defineEmits({
  copy: (item) => item != null,
  delete: (id) => typeof id === "string",
});

const { t } = useI18n();
const textRef = ref(null);
const isOverflow = ref(false);
let resizeObserver = null;

function updateOverflowState() {
  const el = textRef.value;
  if (!el) {
    isOverflow.value = false;
    return;
  }
  isOverflow.value = el.scrollWidth > el.clientWidth;
}

async function measureOverflow() {
  await nextTick();
  updateOverflowState();
}

onMounted(() => {
  void measureOverflow();
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      updateOverflowState();
    });
    if (textRef.value) resizeObserver.observe(textRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(
  () => props.item?.text,
  () => {
    void measureOverflow();
  },
);

const tooltipPopperStyle = {
  maxWidth: "min(480px, 90vw)",
  maxHeight: "none",
  overflow: "visible",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  lineHeight: "1.4",
};

const formattedTime = computed(() => {
  const t = Number(props.item?.createdAt);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString();
});
</script>

<style scoped lang="scss">
.history_card {
  border-radius: 10px;
  height: 100%;
}

.history_content {
  display: flex;
  flex-direction: column;
  min-height: 24px;
}

.history_text {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #111827;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
}

.history_footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history_meta {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

.history_actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

:deep(.history_card .el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
</style>
