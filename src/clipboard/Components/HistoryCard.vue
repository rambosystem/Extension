<template>
  <el-card shadow="hover" class="history_card" @mousedown="handleCardMouseDown" @click="handleCardClick">
    <div class="history_row">
      <el-tooltip :content="item.text" placement="top-start" :show-after="500" :z-index="2147483600"
        :disabled="!item.text || !isOverflow" :popper-style="tooltipPopperStyle">
        <p ref="textRef" class="history_text">
          {{ item.text }}
        </p>
      </el-tooltip>
      <div class="history_actions" :class="{ is_open: showMoreActions }">
        <!-- 已固定：Pin 常显，点击取消固定；样式与 PopupFrame 头部 Pin 一致 -->
        <button v-if="isTop" type="button" class="action_btn pin_btn is_pinned" @click.stop="handlePinClick">
          <img :src="pinIconFixed" class="action_icon_img" alt="" draggable="false" />
        </button>
        <!-- 未固定：Pin / 删除 / 复制 在折叠里，点击 Pin 固定 -->
        <div class="more_actions">
          <button v-if="!isTop" type="button" class="action_btn pin_btn" @click.stop="handlePinClick">
            <img :src="pinIconUnfixed" class="action_icon_img" alt="" draggable="false" />
          </button>
          <button type="button" class="action_btn" @click.stop="handleFavoriteClick">
            <el-icon class="action_icon_el">
              <Star />
            </el-icon>
          </button>
          <button type="button" class="action_btn" @click.stop="handleDeleteClick">
            <img :src="deleteIcon" class="action_icon_img" alt="" draggable="false" />
          </button>
          <button type="button" class="action_btn" @click.stop="emit('copy', item)">
            <img :src="copyIcon" class="action_icon_img" alt="" draggable="false" />
          </button>
        </div>
        <button type="button" class="action_btn more_btn" @click.stop="showMoreActions = !showMoreActions">
          <img :src="moreIcon" class="action_icon_img" alt="" draggable="false" />
        </button>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { Star } from "@element-plus/icons-vue";
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
  copyAndPaste: (item) => item != null,
  pin: (id) => typeof id === "string",
  unpin: (id) => typeof id === "string",
  favorite: (id) => typeof id === "string",
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

function handleCardMouseDown(event) {
  event.preventDefault();
}

function handleCardClick(event) {
  if (event.target.closest(".history_actions")) return;
  emit("copyAndPaste", props.item);
}

function handlePinClick() {
  showMoreActions.value = false;
  if (props.isTop) {
    emit("unpin", props.item.id);
  } else {
    emit("pin", props.item.id);
  }
}

function handleDeleteClick() {
  showMoreActions.value = false;
  emit("delete", props.item.id);
}

function handleFavoriteClick() {
  showMoreActions.value = false;
  emit("favorite", props.item.id);
}
</script>

<style scoped lang="scss">
.history_card {
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease;
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
  width: 16px;
  height: 16px;
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

.action_btn.pin_btn.is_pinned {
  background: #e5e7eb;
  color: #374151;
}

.action_icon_el {
  width: 16px;
  height: 16px;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action_icon_el :deep(svg) {
  width: 16px;
  height: 16px;
}

:deep(.history_card .el-card__body) {
  padding: 10px 12px;
}
</style>
