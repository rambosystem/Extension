// useTermsManager.js - 管理广告术语（基于API）
import { ref, computed, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "./useI18n.js";
import { useStorage } from "./useStorage.js";
import { fetchCurrentUserTerms, addUserTerms, deleteUserTerm, fetchUserTermsStatus } from "../requests/terms.js";

export function useTermsManager() {
    const { t } = useI18n();
    const { saveToStorage, getFromStorage } = useStorage();
    
    // 存储键
    const STORAGE_KEY = "ad_terms_status";
    
    // 响应式状态
    const termsStatus = ref(true); // 默认启用
    const termsTitle = computed(() => t("terms.defaultTerms"));
    const termsData = ref([]); // 从API获取的terms数据
    const totalTerms = ref(0); // terms总数
    const loading = ref(false); // 加载状态
    const error = ref(null); // 错误状态
    const embeddingStatus = ref(false); // embedding状态
    const lastEmbeddingTime = ref(''); // 最后embedding时间
    
    /**
     * 初始化术语字典状态
     */
    const initializeTermsStatus = () => {
        const savedStatus = getFromStorage(STORAGE_KEY);
        termsStatus.value = savedStatus !== undefined ? savedStatus : true;
    };
    
    /**
     * 从API获取terms状态信息
     */
    const fetchTermsStatus = async () => {
        if (loading.value) return; // 防止重复请求
        
        loading.value = true;
        error.value = null;
        
        try {
            const statusData = await fetchUserTermsStatus();
            totalTerms.value = statusData.total_terms || 0;
            embeddingStatus.value = statusData.embedding_status || false;
            lastEmbeddingTime.value = statusData.last_embedding_time || '';
            
            console.log('Terms status loaded successfully:', statusData);
        } catch (err) {
            error.value = err.message;
            console.error('Failed to fetch terms status:', err);
            ElMessage.error(t("terms.fetchStatusFailed") || 'Failed to fetch terms status');
        } finally {
            loading.value = false;
        }
    };
    
    /**
     * 从API获取terms数据
     */
    const fetchTerms = async () => {
        if (loading.value) return; // 防止重复请求
        
        loading.value = true;
        error.value = null;
        
        try {
            const data = await fetchCurrentUserTerms();
            termsData.value = data.terms || [];
            
            console.log('Terms data loaded successfully:', data);
        } catch (err) {
            error.value = err.message;
            console.error('Failed to fetch terms:', err);
            ElMessage.error(t("terms.fetchFailed") || 'Failed to fetch terms data');
        } finally {
            loading.value = false;
        }
    };
    
    /**
     * 刷新terms数据和状态
     */
    const refreshTerms = async () => {
        // 同时获取状态信息和terms数据
        await Promise.all([
            fetchTermsStatus(),
            fetchTerms()
        ]);
    };
    
    /**
     * 添加新的terms数据
     * @param {Array} newTermsData - 新的terms数据数组
     * @returns {Promise<Object>} 添加后的完整terms数据
     */
    const addTerms = async (newTermsData) => {
        if (loading.value) return; // 防止重复请求
        
        loading.value = true;
        error.value = null;
        
        try {
            const data = await addUserTerms(newTermsData);
            termsData.value = data.terms || [];
            
            // 添加成功后刷新状态信息
            await fetchTermsStatus();
            
            console.log('Terms added successfully:', data);
            
            // 显示成功提示，包含提交的terms数量
            const addedCount = newTermsData.length;
            ElMessage.success(t("terms.addSuccess", { count: addedCount }) || `成功提交${addedCount}个terms更新至数据库`);
            
            return data;
        } catch (err) {
            error.value = err.message;
            console.error('Failed to add terms:', err);
            ElMessage.error(t("terms.addFailed") || 'Failed to add terms data');
            throw err;
        } finally {
            loading.value = false;
        }
    };
    
    /**
     * 删除单个term数据
     * @param {string} enTerm - 要删除的英文term
     * @returns {Promise<Object>} 删除后的完整terms数据
     */
    const deleteTerm = async (enTerm) => {
        if (loading.value) return; // 防止重复请求
        
        loading.value = true;
        error.value = null;
        
        try {
            const data = await deleteUserTerm(enTerm);
            
            // 处理删除成功的情况
            if (data.success && data.message) {
                console.log('Term deleted successfully:', data);
                
                // 删除成功后需要重新获取terms数据和状态
                await refreshTerms();
                
                // 显示成功提示
                ElMessage.success(t("terms.deleteSuccess") || '术语删除成功');
                
                return data;
            }
            
            // 如果返回了terms数组，直接更新数据
            if (Array.isArray(data.terms)) {
                termsData.value = data.terms;
                
                // 刷新状态信息
                await fetchTermsStatus();
                
                console.log('Term deleted successfully, updated data:', data);
                
                // 显示成功提示
                ElMessage.success(t("terms.deleteSuccess") || '术语删除成功');
                
                return data;
            }
            
            throw new Error('Unexpected response format from delete API');
            
        } catch (err) {
            error.value = err.message;
            console.error('Failed to delete term:', err);
            ElMessage.error(t("terms.deleteFailed") || '删除术语失败');
            throw err;
        } finally {
            loading.value = false;
        }
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
        return totalTerms.value;
    };
    
    /**
     * 获取terms数据
     * @returns {Array} terms数据数组
     */
    const getTermsData = () => {
        return termsData.value;
    };
    
    /**
     * 获取embedding状态
     * @returns {boolean} embedding状态
     */
    const getEmbeddingStatus = () => {
        return embeddingStatus.value;
    };

    /**
     * 获取最后embedding时间
     * @returns {string} 最后embedding时间
     */
    const getLastEmbeddingTime = () => {
        return lastEmbeddingTime.value;
    };
    
    /**
     * 检查是否有错误
     * @returns {boolean} 是否有错误
     */
    const hasError = () => {
        return error.value !== null;
    };
    
    /**
     * 获取错误信息
     * @returns {string|null} 错误信息
     */
    const getError = () => {
        return error.value;
    };
    
    /**
     * 检查是否正在加载
     * @returns {boolean} 是否正在加载
     */
    const isLoading = () => {
        return loading.value;
    };
    
    /**
     * 检查是否有变动
     * @param {Array} currentData - 当前数据
     * @param {Array} originalData - 原始数据
     * @returns {boolean} 是否有变动
     */
    const hasChanges = (currentData, originalData) => {
        return JSON.stringify(currentData) !== JSON.stringify(originalData);
    };
    
    /**
     * 获取变动的terms数据
     * @param {Array} currentData - 当前数据
     * @param {Array} originalData - 原始数据
     * @returns {Array} 变动的terms数据
     */
    const getChangedTerms = (currentData, originalData) => {
        const changedTerms = [];
        
        for (let i = 0; i < currentData.length; i++) {
            const current = currentData[i];
            const original = originalData[i];
            
            if (!original || 
                current.en !== original.en || 
                current.cn !== original.cn || 
                current.jp !== original.jp) {
                changedTerms.push(current);
            }
        }
        
        return changedTerms;
    };
    
    // 立即初始化状态
    initializeTermsStatus();
    
    // 监听国际化变化，重新初始化
    watch(() => t("terms.defaultTerms"), () => {
        // 标题会自动更新，因为使用了computed
    });
    
    // 组件挂载时自动获取数据
    onMounted(() => {
        refreshTerms();
    });
    
    return {
        // 状态
        termsStatus,
        termsTitle,
        termsData,
        totalTerms,
        loading,
        error,
        embeddingStatus,
        lastEmbeddingTime,
        
        // 方法
        updateTermStatus,
        getTermStatus,
        resetTermsStatus,
        getTotalTerms,
        getTermsData,
        fetchTerms,
        refreshTerms,
        addTerms,
        deleteTerm,
        hasChanges,
        getChangedTerms,
        hasError,
        getError,
        isLoading,
        getEmbeddingStatus,
        getLastEmbeddingTime,
    };
} 