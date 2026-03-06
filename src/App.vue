<template>
  <div class="app-container">
    <el-container>
      <el-main>
        <el-header>
          <div class="header_icon">
            <img src="./assets/icon.svg" class="logo_icon" draggable="false" />
          </div>
          <div class="header_button_group">
            <el-button
              :icon="Setting"
              size="24"
              @click="handleSettingClick"
              circle
            ></el-button>
          </div>
        </el-header>
        <div class="main-content">
          <el-row :gutter="10">
            <el-col :span="6" @click="handleLokaliseClick">
              <div class="grid-content">
                <WeightItem
                  :title="t('app.lokalise')"
                  url="/src/assets/lokalise.svg"
                />
              </div>
            </el-col>
            <el-col :span="6" @click="handleTranslationClick">
              <div class="grid-content">
                <WeightItem
                  :title="t('app.translation')"
                  :url="translationSvg"
                />
              </div>
            </el-col>
            <el-col :span="6" @click="handleFavoritesClick">
              <div class="grid-content">
                <WeightItem :title="t('app.clipboard')" :url="clipboardSvg" />
              </div>
            </el-col>
            <el-col :span="6">
              <div class="grid-content" />
            </el-col>
          </el-row>
        </div>
      </el-main>
      <el-footer>
        <div class="footer_text">{{ t("app.copyright") }}</div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { Setting } from "@element-plus/icons-vue";
import { useI18n } from "@/lokalise/composables/Core/useI18n.js";
import { ROUTE_INDEX } from "@/routes/constants.js";
import WeightItem from "@/components/terms/Weight-Item.vue";
import translationSvg from "@/assets/translation.svg";
import clipboardSvg from "@/assets/clipboard.svg";

const { t } = useI18n();

const handleSettingClick = () => {
  chrome.storage.local.set(
    { initialMenu: ROUTE_INDEX.SETTINGS, currentMenu: ROUTE_INDEX.SETTINGS },
    () => {
      chrome.runtime.openOptionsPage(() => {
        window.close();
      });
    },
  );
};

const handleLokaliseClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "lokalise",
    });
  });

  chrome.storage.local.set(
    { initialMenu: ROUTE_INDEX.LOKALISE, currentMenu: ROUTE_INDEX.LOKALISE },
    () => {
      chrome.runtime.openOptionsPage(() => {
        window.close();
      });
    },
  );
};

const handleTranslationClick = () => {
  // 注掉侧边栏，直接跳转�?Translate Setting
  // chrome.windows.getCurrent((win) => {
  //   if (win?.id != null && chrome.sidePanel?.open) {
  //     chrome.sidePanel.open({ windowId: win.id }).then(() => {
  //       window.close();
  //     }).catch(() => {
  //       chrome.storage.local.set({ initialMenu: "2", currentMenu: "2" }, () => {
  //         chrome.runtime.openOptionsPage(() => window.close());
  //       });
  //     });
  //   } else {
  //     chrome.storage.local.set({ initialMenu: "2", currentMenu: "2" }, () => {
  //       chrome.runtime.openOptionsPage(() => window.close());
  //     });
  //   }
  // });
  chrome.storage.local.set(
    { initialMenu: ROUTE_INDEX.TRANSLATE, currentMenu: ROUTE_INDEX.TRANSLATE },
    () => {
      chrome.runtime.openOptionsPage(() => window.close());
    },
  );
};

const handleFavoritesClick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      window.close();
      return;
    }
    chrome.tabs
      .sendMessage(tabs[0].id, { action: "showFavoritesPopup" })
      .then(() => {
        window.close();
      })
      .catch(() => {
        chrome.storage.local.set(
          {
            initialMenu: ROUTE_INDEX.CLIPBOARD,
            currentMenu: ROUTE_INDEX.CLIPBOARD,
          },
          () => {
            chrome.runtime.openOptionsPage(() => window.close());
          },
        );
      });
  });
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
