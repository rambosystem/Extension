<template>
  <el-container class="common-layout">
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-header">
        <img src="@/assets/icon.svg" alt="Logo" class="adguard-logo" draggable="false" />
      </div>
      <el-menu :default-active="selectedMenu" class="sidebar-menu" @select="handleMenuSelect" background-color="#f8f8f8"
        text-color="#333" active-text-color="#409EFF">
        <el-menu-item v-for="item in menuConfig" :key="item.index" :index="item.index">
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-main class="main-content">
        <div class="content-placeholder">
          <component v-if="currentComponent" :is="currentComponent" :title="currentTitle" />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import Settings from "./Views/Settings.vue";
import Translation from "./Views/Translation.vue";

import { useI18n } from "./composables/Core/useI18n.js";

const { t } = useI18n();

// 菜单项配置 - 使用计算属性确保响应式
const menuConfig = computed(() => [
  {
    index: "1",
    label: t("menu.translation"),
    title: t("menu.translation"),
    component: Translation,
  },
  {
    index: "2",
    label: t("menu.settings"),
    title: t("menu.settings"),
    component: Settings,
  },
  {
    index: "3",
    label: t("menu.about"),
    title: t("menu.about"),
    component: {
      template: `
        <div class="setting_group">
          <h2 class="title">${t("about.title")}</h2>
          <div class="about-content">
            <p>${t("about.content")}</p>
          </div>
        </div>
      `,
    },
  },
]);

// 当前选中的菜单项
const selectedMenu = ref("1"); // 默认选中Translation菜单

// 计算当前应该显示的组件
const currentComponent = computed(() => {
  const item = menuConfig.value.find(
    (item) => item.index === selectedMenu.value
  );
  return item ? item.component : null;
});

const currentTitle = computed(() => {
  const item = menuConfig.value.find(
    (item) => item.index === selectedMenu.value
  );
  return item ? item.title : "";
});

// 菜单选择事件处理
const handleMenuSelect = (index) => {
  selectedMenu.value = index;
  // 保存当前选中的菜单到本地存储
  chrome.storage.local.set({ currentMenu: index });
};

onMounted(() => {
  // 首先检查是否有从 popup 传递过来的菜单选择
  chrome.storage.local.get(["initialMenu", "currentMenu"], (result) => {
    if (result.initialMenu) {
      // 如果有从 popup 传递的菜单，优先使用
      // 如果传递的是Tools菜单（index: "1"），则跳转到Translation菜单
      const menuIndex = result.initialMenu === "1" ? "1" : result.initialMenu;
      selectedMenu.value = menuIndex;
      // 读取后删除，避免刷新时重复选中
      chrome.storage.local.remove("initialMenu");
      // 同时保存到 currentMenu
      chrome.storage.local.set({ currentMenu: menuIndex });
    } else if (result.currentMenu) {
      // 如果没有从 popup 传递的菜单，使用上次保存的菜单
      // 如果保存的是Tools菜单（index: "1"），则跳转到Translation菜单
      const menuIndex = result.currentMenu === "1" ? "1" : result.currentMenu;
      selectedMenu.value = menuIndex;
    }
    // 如果都没有，使用默认值 "1"（Translation菜单）
  });

  // 监听存储变化，当popup设置新的菜单时立即响应
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.currentMenu) {
      selectedMenu.value = changes.currentMenu.newValue;
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
  width: 60%;
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
