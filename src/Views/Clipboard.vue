<template>
  <div class="setting_group">
    <h2 class="title">{{ t("clipboard.title") }}</h2>
    <p class="clipboard-description">{{ t("clipboard.description") }}</p>
    <el-form label-position="top" class="settings-form"> </el-form>
  </div>
</template>

<script setup>
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";

const { t } = useI18n();
</script>

<style scoped lang="scss">
.clipboard-description {
  margin: 0 0 20px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}
</style>
