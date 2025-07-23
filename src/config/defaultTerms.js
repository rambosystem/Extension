// defaultTerms.js - 存储默认的广告术语

/**
 * 默认广告术语列表
 * @type {Array<{id: number, en: string, zh: string, ja: string}>}
 */
export const DEFAULT_AD_TERMS = [
    {
        id: 1,
        en: "Ad Terms 1",
        zh: "广告条款 1",
        ja: "広告条項 1"
    },
    {
        id: 2,
        en: "Ad Terms 2",
        zh: "广告条款 2",
        ja: "広告条項 2"
    },
    {
        id: 3,
        en: "Ad Terms 3",
        zh: "广告条款 3",
        ja: "広告条項 3"
    }
];


/**
 * 术语映射对象
 * @type {Object}
 */
export const TERMS_MAP = {
    Default: DEFAULT_AD_TERMS,
    // 未来可以添加其他类型的广告术语
};