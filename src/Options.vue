<template>
  <el-container class="common-layout">
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-header">
        <img
          src="/src/assets/rambo.svg"
          alt="Logo"
          class="adguard-logo"
          draggable="false"
        />
      </div>

      <el-menu
        :default-active="selectedMenu"
        class="sidebar-menu"
        @select="handleMenuSelect"
        background-color="#f8f8f8"
        text-color="#333"
        active-text-color="#409EFF"
      >
        <el-menu-item
          v-for="item in menuConfig"
          :key="item.index"
          :index="item.index"
        >
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-main class="main-content">
        <div class="content-placeholder">
          <component
            v-if="currentComponent"
            :is="currentComponent"
            :title="currentTitle"
          />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import Settings from "./Components/Settings.vue";
import Tools from "./Components/Tools.vue";
import Translation from "./Components/Translation.vue";

// 菜单项配置
const menuConfig = [
  {
    index: "1",
    label: "常用工具",
    title: "常用工具",
    component: Tools,
  },
  {
    index: "2",
    label: "国际化翻译",
    title: "国际化翻译",
    component: Translation,
  },
  {
    index: "3",
    label: "设置",
    title: "设置",
    component: Settings,
  },
  {
    index: "4",
    label: "关于",
    title: "关于",
    component: {
      template: `
        <div class="setting_group">
          <h2 class="title">关于</h2>
          <div class="about-content">
            <p>关于页面内容</p>
          </div>
        </div>
      `,
    },
  },
];

// 当前选中的菜单项
const selectedMenu = ref("1");

// 计算当前应该显示的组件
const currentComponent = computed(() => {
  const item = menuConfig.find((item) => item.index === selectedMenu.value);
  return item ? item.component : null;
});

const currentTitle = computed(() => {
  const item = menuConfig.find((item) => item.index === selectedMenu.value);
  return item ? item.title : "";
});

// 菜单选择事件处理
const handleMenuSelect = (index) => {
  selectedMenu.value = index;
};

onMounted(() => {
  chrome.storage.local.get(["initialMenu"], (result) => {
    if (result.initialMenu) {
      selectedMenu.value = result.initialMenu;
      // 读取后删除，避免刷新时重复选中
      chrome.storage.local.remove("initialMenu");
    }
  });
});
</script>

<style scoped>
.common-layout {
  height: 100vh;
  display: flex;
  user-select: none;
}

.sidebar {
  background-color: #f8f8f8;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px 0;
}

.sidebar-header {
  padding: 15px 28px;
  display: flex;
  align-items: center;
  height: 60px;
  box-sizing: border-box;
}

.adguard-logo {
  height: 24px;
  width: auto;
  pointer-events: none;
}

.sidebar-menu {
  border-right: none;
  flex-grow: 1;
  padding-top: 10px;
}

.sidebar-menu .el-menu-item {
  height: 52px;
  line-height: 52px;
  font-size: 16px;
  color: #333;
  padding: 0 20px 0 32px !important;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #e4e4e4 !important;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #ffffff !important;
  color: var(--text-main-text-main-default) !important;
  font-weight: 600;
  border-left: none;
  padding: 16px 32px !important;
  line-height: 20px;
  font-size: 16px;
  transition: var(--t3) box-shadow, var(--t3) background-color, var(--t3) color;
}

.main-content {
  font-size: 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background-color: #ffffff;
  overflow-y: auto;
}

.content-placeholder {
  padding: 40px 0;
  min-height: 400px;
  width: 672px;
}

/* 关于页面样式 */
:deep(.about-content) {
  padding: 16px;
  width: 100%;
}

:deep(.about-content p) {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
}
</style>
