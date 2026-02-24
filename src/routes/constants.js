/**
 * 选项页菜单顺序（唯一数据源）：列表顺序即侧栏顺序，索引由顺序派生。
 * 新增菜单：1）在此列表追加 key；2）在 routes/index.js 的 ROUTE_CONFIG 中补同名配置。
 */
export const MENU_ORDER = [
  "LOKALISE",
  "TRANSLATE",
  "CLIPBOARD",
  "SETTINGS",
  "ABOUT",
];

/** 由 MENU_ORDER 派生：ROUTE_INDEX[key] = 当前项在列表中的序号（从 1 开始） */
export const ROUTE_INDEX = Object.fromEntries(
  MENU_ORDER.map((key, i) => [key, String(i + 1)])
);
