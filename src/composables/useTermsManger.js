// useTermsManager.js - 管理广告术语
import { TERMS_MAP } from "../config/defaultTerms.js";
import { ref, computed, watch } from "vue";
import { useI18n } from "./useI18n.js";
import { useStorage } from "./useStorage.js";

export function useTermsManager() {
    const { t } = useI18n();
    const { saveToStorage, getFromStorage } = useStorage();
    
    // 存储键
    const STORAGE_KEY = "ad_terms_status";
    
    // 响应式状态 - 单个术语字典
    const termsStatus = ref(true); // 默认启用
    const termsTitle = computed(() => t("terms.defaultTerms"));
    const termsTranslations = ref(TERMS_MAP.Default || []);
    
    /**
     * 初始化术语字典状态
     */
    const initializeTermsStatus = () => {
        const savedStatus = getFromStorage(STORAGE_KEY);
        termsStatus.value = savedStatus !== undefined ? savedStatus : true;
    };
    
    /**
     * 更新术语状态
     * @param {boolean} status - 新状态
     */
    const updateTermStatus = (status) => {
        termsStatus.value = status;
        saveToStorage(STORAGE_KEY, status);
    };
    
    /**
     * 获取术语状态
     * @returns {boolean} 术语状态
     */
    const getTermStatus = () => {
        return termsStatus.value;
    };
    
    /**
     * 重置状态为默认值
     */
    const resetTermsStatus = () => {
        termsStatus.value = true;
        saveToStorage(STORAGE_KEY, true);
    };
    
    /**
     * 获取术语总数
     * @returns {number} 术语总数
     */
    const getTotalTerms = () => {
        return termsTranslations.value.length;
    };
    
    // 立即初始化
    initializeTermsStatus();
    
    // 监听国际化变化，重新初始化
    watch(() => t("terms.defaultTerms"), () => {
        // 标题会自动更新，因为使用了computed
    });
    
    return {
        // 状态
        termsStatus,
        termsTitle,
        termsTranslations,
        
        // 方法
        updateTermStatus,
        getTermStatus,
        resetTermsStatus,
        getTotalTerms,
    };
}
