// useTermsManager.js - 管理广告术语
import { TERMS_MAP } from "../config/defaultTerms.js";
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "./useI18n.js";
import { useStorage } from "./useStorage.js";

export function useTermsManager() {
    const { t } = useI18n();
    const { saveToStorage, getFromStorage } = useStorage();
    
    // 存储键
    const STORAGE_KEY = "ad_terms_status";
    
    // 响应式状态
    const adTermsList = ref([]);
    
    /**
     * 初始化广告术语列表
     */
    const initializeTermsList = () => {
        const savedStatus = getFromStorage(STORAGE_KEY) || {};
        
        adTermsList.value = [{
            id: 1,
            title: t("terms.defaultTerms"),
            content: t("terms.defaultTerms"),
            translations: TERMS_MAP.Default || [],
            status: savedStatus[1] !== undefined ? savedStatus[1] : true,
        },
];
    };
    
    /**
     * 更新术语状态
     * @param {number} id - 术语ID
     * @param {boolean} status - 新状态
     */
    const updateTermStatus = (id, status) => {
        const term = adTermsList.value.find(item => item.id === id);
        if (term) {
            term.status = status;
            
            // 保存到本地存储
            const savedStatus = getFromStorage(STORAGE_KEY) || {};
            savedStatus[id] = status;
            saveToStorage(STORAGE_KEY, savedStatus);
        }
    };
    
    /**
     * 获取术语状态
     * @param {number} id - 术语ID
     * @returns {boolean} 术语状态
     */
    const getTermStatus = (id) => {
        const term = adTermsList.value.find(item => item.id === id);
        return term ? term.status : false;
    };
    
    /**
     * 重置所有状态为默认值
     */
    const resetTermsStatus = () => {
        adTermsList.value.forEach(term => {
            term.status = term.id === 1 ? true : false;
        });
        
        // 清除存储的状态
        saveToStorage(STORAGE_KEY, {});
    };
    
    // 立即初始化，不等待 onMounted
    initializeTermsList();
    
    // 监听国际化变化，重新初始化列表
    watch(() => t("terms.defaultTerms"), () => {
        initializeTermsList();
    });

    const handleAddTermsDict = () => {
        adTermsList.value.push({
            id: adTermsList.value.length + 1,
            title: t("terms.customTerms"),
            content: t("terms.customTerms"),
            translations: [],
            status: false,
        });
        saveToStorage(STORAGE_KEY, adTermsList.value);
    };
    
    return {
        adTermsList,
        updateTermStatus,
        getTermStatus,
        resetTermsStatus,
        handleAddTermsDict,
    };
}
