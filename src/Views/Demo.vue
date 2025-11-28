<template>
  <div class="demo-container">
    <h2 class="demo-title">Excel 组件演示</h2>

    <div class="demo-section">
      <h3 class="section-title">默认配置（所有功能启用）</h3>
      <Excel />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用列宽调整（默认100px）</h3>
      <Excel :enable-column-resize="false" />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用列宽调整（自定义120px）</h3>
      <Excel :enable-column-resize="false" :default-column-width="120" />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用智能填充</h3>
      <Excel :enable-fill-handle="false" />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用行高调整</h3>
      <Excel :enable-row-resize="false" />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用行高调整（自定义40px）</h3>
      <Excel :enable-row-resize="false" :default-row-height="40" />
    </div>

    <div class="demo-section">
      <h3 class="section-title">禁用所有扩展功能</h3>
      <Excel
        :enable-column-resize="false"
        :enable-row-resize="false"
        :enable-fill-handle="false"
      />
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
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.section-title {
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: 600;
  color: #495057;
}
</style>
