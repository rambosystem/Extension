<template>
  <div class="demo-container">
    <h2 class="demo-title">Excel 组件演示</h2>
    <Excel />
  </div>
</template>

<script setup>
import Excel from "../Components/Common/Excel.vue";
</script>

<style scoped lang="scss">
.demo-container {
  padding: 20px;
}

.demo-title {
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}
</style>
