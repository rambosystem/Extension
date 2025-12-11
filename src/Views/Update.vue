<template>
  <div class="update_group">
    <h2 class="title">{{ t("update.title") }}</h2>
    <div class="update-content">
      <p>{{ t("update.content") }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "../composables/Core/useI18n.js";

const { t } = useI18n();

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});
</script>

<style lang="scss" scoped>
.update_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.update-content {
  padding: 16px;
  width: 100%;
}

.update-content p {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}
</style>
