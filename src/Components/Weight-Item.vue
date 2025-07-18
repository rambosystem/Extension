<template>
  <div class="weight-item">
    <div class="weight-item-icon">
      <el-image :src="url" :fit="fill" />
    </div>
    <div class="weight-item-title">
      <span class="weight-item-title-text">
        {{ title }}
      </span>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
});
</script>
<style lang="scss" scoped>
.weight-item {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 74px;
  .weight-item-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 8px;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .weight-item-title-text {
    font-size: 12px;
    color: #666666;
    font-weight: 500;
  }
}
</style>
