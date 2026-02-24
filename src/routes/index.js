/**
 * 选项页侧边栏菜单路由配置
 * 顺序以 constants.js 的 MENU_ORDER 为准，此处仅配置每项的 labelKey/titleKey/component
 */
import { MENU_ORDER } from "./constants.js";
export { ROUTE_INDEX } from "./constants.js";

import Settings from "@/Views/Settings.vue";
import Lokalise from "@/lokalise/Lokalise.vue";
import Translate from "@/Views/Translate.vue";
import Clipboard from "@/Views/Clipboard.vue";

/** About 页为内联模板，依赖 t，通过 factory 在 Options 中注入 */
export function getAboutComponent(t) {
  return {
    template: `
      <div class="setting_group">
        <h2 class="title">${t("about.title")}</h2>
        <div class="about-content">
          <p>${t("about.content")}</p>
        </div>
      </div>
    `,
  };
}

/** 每项配置：labelKey、titleKey、component 或 componentFactory */
const ROUTE_CONFIG = {
  LOKALISE: {
    labelKey: "menu.translation",
    titleKey: "menu.translation",
    component: Lokalise,
  },
  TRANSLATE: {
    labelKey: "menu.translate",
    titleKey: "Translate.title",
    component: Translate,
  },
  CLIPBOARD: {
    labelKey: "menu.clipboard",
    titleKey: "clipboard.title",
    component: Clipboard,
  },
  SETTINGS: {
    labelKey: "menu.settings",
    titleKey: "menu.settings",
    component: Settings,
  },
  ABOUT: {
    labelKey: "menu.about",
    titleKey: "menu.about",
    componentFactory: getAboutComponent,
  },
};

/** 校验：MENU_ORDER 与 ROUTE_CONFIG 的 key 一致，避免漏配 */
function validateRouteConfig() {
  const configKeys = new Set(Object.keys(ROUTE_CONFIG));
  const orderSet = new Set(MENU_ORDER);
  for (const key of MENU_ORDER) {
    if (!ROUTE_CONFIG[key]) {
      throw new Error(
        `[routes] MENU_ORDER contains "${key}", but ROUTE_CONFIG is missing this configuration`,
      );
    }
  }
  for (const key of configKeys) {
    if (!orderSet.has(key)) {
      throw new Error(
        `[routes] ROUTE_CONFIG contains "${key}", but it is not declared in MENU_ORDER`,
      );
    }
  }
}
validateRouteConfig();

/** 菜单路由表：按 MENU_ORDER 顺序，index 由列表位置派生（与 ROUTE_INDEX 一致） */
export const menuRoutes = MENU_ORDER.map((key, i) => ({
  index: String(i + 1),
  ...ROUTE_CONFIG[key],
}));
