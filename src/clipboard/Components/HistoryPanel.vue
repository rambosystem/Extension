<template>
  <el-scrollbar
    v-if="items.length"
    height="320px"
    class="history_scrollbar"
  >
    <div class="history_list">
      <div
        v-for="item in items"
        :key="item.id"
        class="history_item_row"
      >
        <HistoryCard
          :item="item"
          :is-top="isFavoritesView ? !!item.favoritePinned : !!item.pinned"
          :is-favorites-view="isFavoritesView"
          @copy="emit('copy', $event)"
          @copy-and-paste="emit('copyAndPaste', $event)"
          @pin="emit('pin', $event)"
          @unpin="emit('unpin', $event)"
          @favorite="emit('favorite', $event)"
          @unfavorite="emit('unfavorite', $event)"
          @delete="emit('delete', $event)"
        />
      </div>
    </div>
  </el-scrollbar>
  <p v-else class="clipboard_placeholder">{{ emptyText }}</p>
</template>

<script setup>
import HistoryCard from "./HistoryCard.vue";

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: "",
  },
  isFavoritesView: {
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
  unfavorite: (id) => typeof id === "string",
  delete: (id) => typeof id === "string",
});
</script>

<style scoped lang="scss">
.history_list {
  padding-right: 2px;
}

.history_item_row {
  margin: 10px;
}

.history_scrollbar {
  max-height: 320px;
  overscroll-behavior: contain;

  :deep(.el-scrollbar__wrap) {
    overscroll-behavior: contain;
  }
}

.clipboard_placeholder {
  margin-left: 10px;
  font-size: 13px;
  color: #6b7280;
}
</style>
