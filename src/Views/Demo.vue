<template>
  <div class="demo-container">
    <h2 class="demo-title">Excel 组件演示</h2>
    <div class="demo-section">
      <Excel />
    </div>
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
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.demo-section {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}
</style>
