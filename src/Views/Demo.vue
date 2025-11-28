<template>
  <div class="demo-container">
    <h2 class="demo-title">Excel 组件演示</h2>

    <div class="demo-section">
      <h3 class="section-title">默认配置（所有功能启用）</h3>
      <Excel />
    </div>

    <div class="demo-section">
      <h3 class="section-title">v-model 双向绑定</h3>
      <Excel v-model="excelData1" />
      <div class="data-preview">
        <strong>当前数据：</strong>
        <pre>{{ JSON.stringify(excelData1, null, 2) }}</pre>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="section-title">初始数据 + 方法调用</h3>
      <Excel
        ref="excelRef"
        :model-value="initialData"
        @change="handleDataChange"
      />
      <div class="button-group">
        <button @click="updateCellData">更新 A1 单元格</button>
        <button @click="clearAllData">清空数据</button>
        <button @click="setNewData">设置新数据</button>
        <button @click="getCurrentData">获取当前数据</button>
      </div>
      <div class="data-preview">
        <strong>数据变化次数：</strong>{{ changeCount }}
      </div>
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
import { ref } from "vue";
import Excel from "../Components/Common/Excel.vue";

// v-model 示例数据
const excelData1 = ref([
  ["姓名", "年龄", "城市"],
  ["张三", "25", "北京"],
  ["李四", "30", "上海"],
  ["王五", "28", "广州"],
]);

// 初始数据示例
const initialData = ref([
  ["产品", "价格", "库存"],
  ["商品A", "100", "50"],
  ["商品B", "200", "30"],
  ["商品C", "150", "80"],
]);

// 方法调用示例
const excelRef = ref(null);
const changeCount = ref(0);

const handleDataChange = (data) => {
  changeCount.value++;
  console.log("数据变化:", data);
};

const updateCellData = () => {
  if (excelRef.value) {
    excelRef.value.updateCell(0, 0, "更新后的产品");
  }
};

const clearAllData = () => {
  if (excelRef.value) {
    excelRef.value.clearData();
  }
};

const setNewData = () => {
  if (excelRef.value) {
    const newData = [
      ["新列1", "新列2", "新列3"],
      ["数据1", "数据2", "数据3"],
      ["数据4", "数据5", "数据6"],
    ];
    excelRef.value.setData(newData);
  }
};

const getCurrentData = () => {
  if (excelRef.value) {
    const data = excelRef.value.getData();
    console.log("当前数据:", data);
    alert("数据已输出到控制台，请查看");
  }
};
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

.data-preview {
  margin-top: 15px;
  padding: 10px;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 12px;

  pre {
    margin: 5px 0 0 0;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }
}

.button-group {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  button {
    padding: 8px 16px;
    background: #4a90e2;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;

    &:hover {
      background: #357abd;
    }

    &:active {
      background: #2a5f8f;
    }
  }
}
</style>
