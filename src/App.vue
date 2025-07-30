<template>
  <div class="app-container">
    <el-container>
      <el-main>
        <el-header>
          <div class="header_icon">
            <img src="./assets/rambo.svg" class="logo_icon" draggable="false" />
          </div>
          <div class="header_button_group">
            <el-button :icon="Setting" size="24" @click="handleSettingClick" circle></el-button>
          </div>
        </el-header>
        <div class="main-content">
          <el-row :gutter="10">
            <el-col :span="6" @click="handleLokaliseClick">
              <div class="grid-content">
                <WeightItem title="Lokalise" url="/src/assets/lokalise.svg" />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="grid-content" />
            </el-col>
            <el-col :span="6">
              <div class="grid-content" />
            </el-col>
            <el-col :span="6">
              <div class="grid-content" />
            </el-col>
          </el-row>
        </div>
      </el-main>
      <el-footer>
        <div class="footer_text">© Rambo Systems Software Ltd</div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { Setting } from "@element-plus/icons-vue";
import WeightItem from "./Components/Weight-Item.vue";

const handleSettingClick = () => {
  // 检查options页面是否已经打开
  chrome.tabs.query({ url: chrome.runtime.getURL("options/options.html") }, (tabs) => {
    if (tabs.length > 0) {
      // options页面已经打开，激活该标签页并跳转到设置tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.storage.local.set({ initialMenu: "3", currentMenu: "3" });
    } else {
      // options页面未打开，创建新标签页
      chrome.storage.local.set({ initialMenu: "3", currentMenu: "3" }, () => {
        chrome.runtime.openOptionsPage();
      });
    }
  });
  window.close();
};

const handleLokaliseClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "lokalise",
    });
  });
  console.log("Lokalise action sent");

  // 检查options页面是否已经打开
  chrome.tabs.query({ url: chrome.runtime.getURL("options/options.html") }, (tabs) => {
    if (tabs.length > 0) {
      // options页面已经打开，激活该标签页并跳转到翻译tab
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.storage.local.set({ initialMenu: "2", currentMenu: "2" });
    } else {
      // options页面未打开，创建新标签页
      chrome.storage.local.set({ initialMenu: "2", currentMenu: "2" }, () => {
        chrome.runtime.openOptionsPage();
      });
    }
  });
  window.close();
};
</script>

<style scoped lang="scss">
.app-container {
  width: 320px;
  user-select: none;
}

.el-header {
  height: 28px;
  width: 280px;
  padding: 0;
  height: 24px;
  display: flex;
  margin-bottom: 5px;
  justify-content: space-between;

  .logo_icon {
    height: 24px;
  }

  .el-button {
    padding: 0;
    height: 24px;
    width: 24px;
    font-size: 24px;
    border: none;
    background-color: transparent;
  }
}

.el-main {
  color: #ffffff;
  height: 400px;

  .main-content {
    padding: 10px 0;
    width: 100%;
  }
}

.el-footer {
  background-color: #f6f6f6;
  height: 40px;
  display: flex;
  align-items: center;

  .footer_text {
    font-size: 14px;
    line-height: 18px;
  }
}

.el-row {
  margin-bottom: 20px;
}

.el-row:last-child {
  margin-bottom: 0;
}

.el-col {
  border-radius: 4px;
}

.grid-content {
  background-color: #f3f5f6;
  border-radius: 10px;
  min-height: 72px;
}

.grid-content:hover {
  background-color: #eaeced;
}
</style>
