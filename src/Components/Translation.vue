<template>
  <div class="setting_group">
    <h2 class="title">{{ title }}</h2>

    <el-form :model="formData" ref="formRef" label-position="top" class="settings-form">

      <div class="translation-content">
        <!-- 这里可以添加国际化翻译的具体功能 -->
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";


const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const formRef = ref();
const formData = reactive({
  // 国际化翻译页面的数据
});

// 国际化翻译页面的方法可以在这里添加
</script>

<style lang="scss" scoped>
.setting_group {
  padding: 16px;
}

.title {
  font-size: 24px;
  margin-bottom: 20px;
}

.settings-form {
  width: 100%;
}

.translation-content {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 16px;
}

:deep(.el-form-item__label) {
  font-size: 16px;
  font-weight: 500;
}
</style>
