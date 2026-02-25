<template>
  <el-card shadow="hover" class="history_card">
    <div class="history_row">
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
      <div class="history_actions" :class="{ is_open: showMoreActions }">
        <div class="more_actions">
          <button
            type="button"
            class="action_btn"
            :title="t('clipboard.pinButton')"
            @click="handlePinClick"
          >
            <img
              :src="isTop ? pinIconFixed : pinIconUnfixed"
              class="action_icon_img"
              alt=""
              draggable="false"
            />
          </button>
          <button
            type="button"
            class="action_btn"
            :title="t('common.delete')"
            @click="handleDeleteClick"
          >
            <img :src="deleteIcon" class="action_icon_img" alt="" draggable="false" />
          </button>
        </div>
        <button
          type="button"
          class="action_btn"
          :title="t('clipboard.copyButton')"
          @click="emit('copy', item)"
        >
          <img :src="copyIcon" class="action_icon_img" alt="" draggable="false" />
        </button>
        <button
          type="button"
          class="action_btn"
          :title="t('clipboard.moreButton')"
          @click="showMoreActions = !showMoreActions"
        >
          <img :src="moreIcon" class="action_icon_img" alt="" draggable="false" />
        </button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import pinIconUnfixed from "@/assets/unfixed.svg";
import pinIconFixed from "@/assets/fixed.svg";
import copyIcon from "@/assets/copy.svg";
import moreIcon from "@/assets/more_field.svg";
import deleteIcon from "@/assets/delete.svg";

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
  isTop: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits({
  copy: (item) => item != null,
  pin: (id) => typeof id === "string",
  delete: (id) => typeof id === "string",
});

const { t } = useI18n();
const textRef = ref(null);
const isOverflow = ref(false);
const showMoreActions = ref(false);
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
    showMoreActions.value = false;
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

function handlePinClick() {
  showMoreActions.value = false;
  emit("pin", props.item.id);
}

function handleDeleteClick() {
  showMoreActions.value = false;
  emit("delete", props.item.id);
}
</script>

<style scoped lang="scss">
.history_card {
  border-radius: 10px;
}

.history_row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history_text {
  flex: 1;
  min-width: 0;
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

.history_actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.more_actions {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateX(8px);
  transition: max-width 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.history_actions.is_open .more_actions {
  max-width: 220px;
  opacity: 1;
  transform: translateX(0);
}

.action_icon_img {
  width: 18px;
  height: 18px;
  display: block;
}

.action_btn {
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
}

.action_btn:hover {
  background: #e5e7eb;
  color: #374151;
}

:deep(.history_card .el-card__body) {
  padding: 10px 12px;
}
</style>
