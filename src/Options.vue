<template>
  <el-container class="common-layout">
    <el-aside width="240px" class="sidebar">
      <div class="sidebar-header">
        <img
          src="@/assets/icon.svg"
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
import { ref, onMounted, onUnmounted, computed } from "vue";
import Settings from "./Views/Settings.vue";
import Lokalise from "./Views/Lokalise.vue";
import Translate from "./Views/Translate.vue";

import { useI18n } from "./composables/Core/useI18n.js";
import { useAppStore } from "./stores/app.js";
import { useTranslationCoreStore } from "./stores/translation/core.js";

const { t } = useI18n();

// 使用应用store
const appStore = useAppStore();
const translationCoreStore = useTranslationCoreStore();

// 菜单项配置 - 使用计算属性确保响应式
const menuConfig = computed(() => [
  {
    index: "1",
    label: t("menu.translation"),
    title: t("menu.translation"),
    component: Lokalise,
  },
  {
    index: "2",
    label: t("menu.translate"),
    title: t("Translate.title"),
    component: Translate,
  },
  {
    index: "3",
    label: t("menu.settings"),
    title: t("menu.settings"),
    component: Settings,
  },

  {
    index: "4",
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

// 选中的菜单项 - 使用store中的状态
const selectedMenu = computed({
  get: () => appStore.currentMenu,
  set: (value) => appStore.setCurrentMenu(value),
});

// 计算应该显示的组件
const currentComponent = computed(() => {
  const item = menuConfig.value.find(
    (item) => item.index === selectedMenu.value,
  );
  return item ? item.component : null;
});

const currentTitle = computed(() => {
  const item = menuConfig.value.find(
    (item) => item.index === selectedMenu.value,
  );
  return item ? item.title : "";
});

// 菜单选择事件处理
const handleMenuSelect = (index) => {
  appStore.setCurrentMenu(index);
};

// 监听 storage 变化，当 popup 设置菜单后 options 已打开时同步切换
let storageListener = null;

onMounted(() => {
  // 初始化应用状态
  appStore.initializeApp();
  // 加载上次翻译结果
  translationCoreStore.loadLastTranslation();

  // 监听 chrome.storage 变化，popup 点击菜单时已打开的 options 页需同步更新
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    storageListener = (changes, areaName) => {
      if (areaName !== "local") return;
      const menuIndex =
        changes.initialMenu?.newValue ?? changes.currentMenu?.newValue;
      if (menuIndex != null) {
        const newMenu = String(menuIndex);
        if (appStore.currentMenu !== newMenu) {
          appStore.setCurrentMenu(newMenu);
        }
        if (changes.initialMenu) {
          chrome.storage.local.remove("initialMenu");
        }
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
  }
});

onUnmounted(() => {
  if (storageListener && typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.removeListener(storageListener);
  }
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
  transition:
    var(--t3) box-shadow,
    var(--t3) background-color,
    var(--t3) color;
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
  width: 70%;
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
