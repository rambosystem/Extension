<template>
    <el-card style="width: 100%; cursor: pointer;" shadow='never' body-style="padding: 16px 20px; border-radius: 10px;"
        @click="handleCardClick">
        <div class="adTerms-content">
            <div class="adTerms-title-container">
                <div class="adTerms-title-text-container">
                    <span class="adTerms-title-text">{{ title }}</span>
                    <div class="adTerms-title-text-icon-container">
                        <el-icon class="adTerms-title-text-icon" @click.stop="handleSettingClick">
                            <Setting />
                        </el-icon>
                    </div>
                </div>
                <el-switch :model-value="status" @update:model-value="handleStatusChange" @click.stop width="45px" />
            </div>
            <div class="adTerms-content-text">
                <div class="total-terms-container">
                    <span class="total-terms">{{ t('terms.totalTerms') }}</span>
                    <span v-if="loading" class="total-value loading">
                        <el-icon class="is-loading">
                            <Loading />
                        </el-icon>
                        {{ t('common.loading') }}
                    </span>
                    <span v-else-if="error" class="total-value error">
                        {{ t('terms.loadFailed') }}
                        <el-button type="text" size="small" @click.stop="handleRefresh" :loading="refreshLoading">
                            {{ t('common.retry') }}
                        </el-button>
                    </span>
                    <span v-else class="total-value">{{ totalTerms }}</span>
                    <div class="embedding-status-container">
                        <span class="embedding-status">Embedding Status:</span>
                        <span class="embedding-status-success" v-if="embeddingStatus === 'completed'">Completed</span>
                        <span class="embedding-status-building"
                            v-else-if="embeddingStatus === 'building'">Building</span>
                        <span class="embedding-status-failed" v-else-if="embeddingStatus === 'failed'">Failed</span>
                        <span class="embedding-status-pending" v-else>Pending</span>
                        <span class="last-embedding-time-text">Last Embedding Time:</span>
                        <span class="last-embedding-time">{{ formatEmbeddingTime(lastEmbeddingTime) ||
                            t('terms.notAvailable') }}</span>
                    </div>
                </div>
            </div>
        </div>
    </el-card>
    <el-dialog v-model="dialogVisible" :title="t('terms.termsSettings')" width="70%" top="10vh">
        <div class="dialog-content">
            <div class="filter-section">
                <el-row :gutter="10">
                    <el-col :span="20">
                        <div class="terms-filter-container">
                            <el-input v-model="filter"
                                :placeholder="t('terms.searchPlaceholder') || 'Search terms in EN, CN, JP...'"
                                @input="handleFilterInput">
                                <template #prefix>
                                    <el-icon>
                                        <Search />
                                    </el-icon>
                                </template>
                            </el-input>
                            <el-button @click="clearFilter" type="default">
                                {{ t('common.clear') || 'Clear' }}
                            </el-button>
                        </div>
                    </el-col>
                    <el-col :span="4">
                        <div class="add-terms-container">
                            <el-button type="primary" @click="addNewTerm" style="width: 100%;">Add Public
                                Terms</el-button>
                        </div>
                    </el-col>
                </el-row>
            </div>
            <div class="table-section">
                <el-table :data="paginatedTermsData" style="width: 100%" height="450" empty-text="" v-loading="loading"
                    :element-loading-text="t('common.loading')">
                    <el-table-column prop="en" label="EN">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.en" :isEditing="row.editing_en" :rowIndex="$index"
                                :columnIndex="0" :isLastCell="false" @enterEdit="enterEditMode($index, 'en')"
                                @exitEdit="row.editing_en = false"
                                @update:value="(value) => { row.en = value; handleTermsChange(); }"
                                @save="() => handleSaveTerm(row)" @tabNext="handleTabNext" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="cn" label="CN">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.cn" :isEditing="row.editing_cn" :rowIndex="$index"
                                :columnIndex="1" :isLastCell="false" @enterEdit="enterEditMode($index, 'cn')"
                                @exitEdit="row.editing_cn = false"
                                @update:value="(value) => { row.cn = value; handleTermsChange(); }"
                                @save="() => handleSaveTerm(row)" @tabNext="handleTabNext" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="jp" label="JP">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.jp" :isEditing="row.editing_jp" :rowIndex="$index"
                                :columnIndex="2" :isLastCell="false" @enterEdit="enterEditMode($index, 'jp')"
                                @exitEdit="row.editing_jp = false"
                                @update:value="(value) => { row.jp = value; handleTermsChange(); }"
                                @save="() => handleSaveTerm(row)" @tabNext="handleTabNext" />
                        </template>
                    </el-table-column>
                    <el-table-column fixed="right" :label="t('common.operation')" width="120">
                        <template #default="{ row }">
                            <div class="operation-container" style="padding-left: 12px;">
                                <el-button type="text" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
            <div class="pagination-section">
                <div class="pagination-container">
                    <div class="pagination-total-container">
                        <el-pagination v-model:current-page="currentPage" :total="totalItems"
                            layout="total"></el-pagination>
                        <span class="pagination-total-text">Terms</span>
                    </div>
                    <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                        :page-sizes="[5, 10, 20, 50]" :total="totalItems" layout="prev, pager, next, jumper"
                        @current-change="handleCurrentChange" @size-change="handleSizeChange" background
                        :pager-count="7" :hide-on-single-page="false" />
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";
import { Setting, Loading } from "@element-plus/icons-vue";
import { ref, computed, watch } from "vue";
import EditableCell from "./EditableCell.vue";
import { useTermsManager } from "../composables/useTermsManager.js";
import { Search } from "@element-plus/icons-vue";
import { addUserTerms } from "../requests/terms.js";


const { t } = useI18n();
const { deleteTerm } = useTermsManager();

const props = defineProps({
    title: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        required: true,
    },
    totalTerms: {
        type: Number,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    error: {
        type: String,
        default: null,
    },
    termsData: {
        type: Array,
        default: () => [],
    },
    embeddingStatus: {
        type: String,
        default: 'pending',
    },
    lastEmbeddingTime: {
        type: String,
        default: '',
    },
    refreshLoading: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:status', 'refresh', 'fetchTermsData']);
const dialogVisible = ref(false);

// 搜索筛选相关状态
const filter = ref('');
const filteredTermsData = ref([]);
const isSearching = ref(false);

// 分页相关状态
const currentPage = ref(1);
const pageSize = ref(10);
const totalItems = ref(0);

// 搜索筛选逻辑
const handleFilter = () => {
    isSearching.value = true;
    currentPage.value = 1; // 重置到第一页

    if (!filter.value.trim()) {
        // 如果搜索词为空，显示所有数据
        filteredTermsData.value = [...props.termsData];
    } else {
        // 执行搜索筛选
        const searchTerm = filter.value.toLowerCase().trim();
        filteredTermsData.value = props.termsData.filter(term => {
            return (
                term.en?.toLowerCase().includes(searchTerm) ||
                term.cn?.toLowerCase().includes(searchTerm) ||
                term.jp?.toLowerCase().includes(searchTerm)
            );
        });
    }

    // 更新总数
    totalItems.value = filteredTermsData.value.length;
    isSearching.value = false;
};

// 清空搜索
const clearFilter = () => {
    filter.value = '';
    handleFilter();
};

// 监听搜索输入变化，实现实时搜索
const handleFilterInput = () => {
    // 使用防抖，避免频繁搜索
    clearTimeout(filter.value.timer);
    filter.value.timer = setTimeout(() => {
        handleFilter();
    }, 300);
};

// 计算当前页显示的数据（基于筛选后的数据）
const paginatedTermsData = computed(() => {
    // 如果有搜索条件，使用筛选后的数据（即使为空）
    // 如果没有搜索条件，使用原始数据
    const dataToUse = filter.value.trim() ? filteredTermsData.value : props.termsData;
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return dataToUse.slice(start, end);
});

// 处理页码变化
const handleCurrentChange = (page) => {
    currentPage.value = page;
};

// 处理每页条数变化
const handleSizeChange = (size) => {
    pageSize.value = size;
    currentPage.value = 1; // 重置到第一页
};

// 监听termsData变化，更新总数和筛选数据
watch(() => props.termsData, (newData) => {
    // 如果有搜索条件，重新执行筛选
    if (filter.value.trim()) {
        handleFilter();
    } else {
        // 没有搜索条件时，清空筛选数据并更新总数
        filteredTermsData.value = [];
        totalItems.value = newData.length;
        // 如果当前页超出范围，重置到第一页
        const maxPage = Math.ceil(totalItems.value / pageSize.value);
        if (currentPage.value > maxPage && maxPage > 0) {
            currentPage.value = 1;
        }
    }
}, { immediate: true });

// 计算当前页信息
const currentPageInfo = computed(() => {
    if (totalItems.value === 0) return '';
    const start = (currentPage.value - 1) * pageSize.value + 1;
    const end = Math.min(currentPage.value * pageSize.value, totalItems.value);
    return `${start}-${end} / ${totalItems.value}`;
});

const handleStatusChange = (value) => {
    emit('update:status', value);
};

// 处理刷新按钮点击
const handleRefresh = () => {
    emit('refresh');
};

// 格式化embedding时间，去掉ISO 8601格式中的T分隔符
const formatEmbeddingTime = (timeString) => {
    if (!timeString || typeof timeString !== 'string') {
        return '';
    }
    // 将ISO 8601格式的 "2025-07-30T10:00:00" 转换为 "2025-07-30 10:00:00"
    return timeString.replace('T', ' ');
};

// 处理卡片的点击事件
const handleCardClick = (event) => {
    // 如果点击的是开关本身，不处理
    if (event.target.closest('.el-switch')) {
        return;
    }
    // 切换开关状态
    const newState = !props.status;
    emit('update:status', newState);
};

const handleDelete = async (row) => {
    try {
        // 如果是新添加的行（未保存），直接从本地数据中删除
        if (row.isNew) {
            const index = props.termsData.findIndex(term => term === row);
            if (index !== -1) {
                props.termsData.splice(index, 1);
                // 如果有搜索条件，重新执行筛选
                if (filter.value.trim()) {
                    handleFilter();
                } else {
                    totalItems.value--;
                }
            }
            return;
        }

        // 对于已保存的行，调用API删除
        await deleteTerm(row.en);
        // 删除成功后，删除en对应的当前行
        const index = props.termsData.findIndex(term => term.en === row.en);
        if (index !== -1) {
            props.termsData.splice(index, 1);
            // 如果有搜索条件，重新执行筛选
            if (filter.value.trim()) {
                handleFilter();
            } else {
                totalItems.value--;
            }
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
};

const handleSettingClick = (event) => {
    dialogVisible.value = true;
    // 重置搜索和分页状态
    filter.value = '';
    currentPage.value = 1;
    filteredTermsData.value = [];
    isSearching.value = false;
    // 打开设置对话框时获取terms数据
    emit('fetchTermsData');
};


const handleTermsChange = () => {
    // 当terms数据发生变化时触发
    // 这里可以添加额外的逻辑，比如实时检测变动状态
};

const getActualIndex = (pageIndex) => {
    // 计算在筛选数据中的实际索引
    const dataToUse = filter.value.trim() ? filteredTermsData.value : props.termsData;
    return (currentPage.value - 1) * pageSize.value + pageIndex;
};

const enterEditMode = (index, field) => {
    // 进入编辑模式
    const dataToUse = filter.value.trim() ? filteredTermsData.value : props.termsData;
    const row = dataToUse[getActualIndex(index)];
    if (row) {
        row[`editing_${field}`] = true;
    }
};

const addNewTerm = () => {
    // 创建新的空白术语行
    const newTerm = {
        en: '',
        cn: '',
        jp: '',
        editing_en: false,
        editing_cn: false,
        editing_jp: false,
        isNew: true // 标记为新添加的行
    };

    // 将新行添加到数据中
    props.termsData.unshift(newTerm); // 添加到数组开头

    // 如果有搜索条件，重新执行筛选
    if (filter.value.trim()) {
        handleFilter();
    } else {
        // 更新总数
        totalItems.value = props.termsData.length;
    }

    // 重置到第一页
    currentPage.value = 1;

    // 自动进入第一行的编辑模式
    setTimeout(() => {
        if (props.termsData.length > 0) {
            props.termsData[0].editing_en = true;
        }
    }, 100);
};

const handleSaveTerm = async (row) => {
    try {
        // 只验证en字段是否填写
        if (!row.en || !row.en.trim()) {
            console.error('English field is required for term:', row);
            return;
        }

        // 调用API保存术语，cn和jp可以为空
        const termsData = [{
            en: row.en.trim(),
            cn: row.cn || '',
            jp: row.jp || ''
        }];

        await addUserTerms(termsData);
        console.log('Term saved successfully:', row);

        // 如果是新添加的行，保存成功后移除isNew标记
        if (row.isNew) {
            delete row.isNew;
        }

        // 保存成功后静默刷新数据，确保显示最新数据
        emit('refresh', false);

        // 可以在这里添加成功提示
        // ElMessage.success('Term saved successfully');

    } catch (error) {
        console.error('Failed to save term:', error);
        // 可以在这里添加错误提示
        // ElMessage.error('Failed to save term: ' + error.message);
    }
};

const handleTabNext = (tabInfo) => {
    const { currentRow, currentColumn, isLastCell } = tabInfo;
    const dataToUse = filter.value.trim() ? filteredTermsData.value : props.termsData;

    // 计算下一个单元格的位置
    let nextRow = currentRow;
    let nextColumn = currentColumn + 1;

    // 如果当前列是最后一列（JP列），跳转到下一行的第一列（EN列）
    if (nextColumn >= 3) {
        nextRow = currentRow + 1;
        nextColumn = 0;
    }

    // 检查是否超出当前页的数据范围
    const startIndex = (currentPage.value - 1) * pageSize.value;
    const endIndex = startIndex + pageSize.value;
    const currentPageData = dataToUse.slice(startIndex, endIndex);

    if (nextRow >= currentPageData.length) {
        // 如果超出当前页范围，检查是否有下一页
        if (nextRow >= dataToUse.length) {
            // 如果超出总数据范围，说明是最后一个单元格，只保存不跳转
            console.log('Reached last cell, saving only');
            return;
        } else {
            // 跳转到下一页
            currentPage.value = Math.floor(nextRow / pageSize.value) + 1;
            // 重新计算在当前页中的位置
            nextRow = nextRow % pageSize.value;
        }
    }

    // 获取下一个单元格的字段名
    const fieldMap = ['en', 'cn', 'jp'];
    const nextField = fieldMap[nextColumn];

    // 退出当前编辑模式
    const currentField = fieldMap[currentColumn];
    const currentRowData = currentPageData[currentRow];
    if (currentRowData) {
        currentRowData[`editing_${currentField}`] = false;
    }

    // 进入下一个单元格的编辑模式
    const nextRowData = currentPageData[nextRow];
    if (nextRowData) {
        nextRowData[`editing_${nextField}`] = true;
    }
};
</script>

<style lang="scss" scoped>
.adTerms-title-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.adTerms-title-text-container {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 15px;
}

.adTerms-title-text-icon-container {
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.terms-filter-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

.label-container {
    color: #45464f;
    font-weight: 500;
    padding-right: 2px;

    .label-text {
        height: 20px;
        padding-right: 5px;
        border-right: 1px solid lightgray;
    }
}

.adTerms-title-text-icon:hover {
    color: #409eff;
}

.adTerms-title-text-icon {
    cursor: pointer;
    font-size: 16px;
    color: #909399;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: all 0.2s ease;
}

.add-terms-container {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
}

.header-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    margin-bottom: 10px;
    gap: 20px;
}

.embedding-status-container {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #303133;
    padding-left: 20px;

    .embedding-status-success {
        color: #67c23a;
        font-weight: 500;
    }

    .embedding-status-building {
        color: #409EFF;
        font-weight: 500;
    }

    .embedding-status-failed {
        color: #f56c6c;
        font-weight: 500;
    }

    .embedding-status-pending {
        color: #e6a23b;
        font-weight: 500;
    }

    .last-embedding-time-text {
        padding-left: 15px;
        color: #303133;
    }

    .last-embedding-time {
        color: #909399;
    }
}

.adTerms-title-text {
    font-weight: 600;
    font-size: 16px;
    color: #303133;
    line-height: 1;
    display: flex;
    align-items: center;
}

.adTerms-content {
    width: 100%;
}

.adTerms-content-text {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .total-terms-container {
        display: flex;
        align-items: center;
        color: #303133;

        .total-terms {
            font-size: 14px;
            margin-right: 5px;
        }

        .total-value {
            font-size: 14px;
            color: #909399;

            &.loading {
                display: flex;
                align-items: center;
                gap: 5px;
                color: #409eff;
            }

            &.error {
                color: #f56c6c;
                display: flex;
                align-items: center;
                gap: 5px;
            }
        }
    }
}

.setting-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.pagination-info {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 10px;
}

.page-info-text {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
}

.pagination-container {
    margin-top: 20px;
    width: 100%;
    display: flex;
    justify-content: space-between;
}

.pagination-total-container {
    padding-left: 22px;
    display: flex;
    align-items: center;
}

.pagination-total-text {
    font-size: 14px;
    color: #606266;
    padding-left: 4px;
}

.terms-cell {
    padding: 0 12px;
    line-height: 50px;
    display: block;
    color: #303133;
}

/* 对话框内容样式 */
.dialog-content {
    margin: 0;
}

.filter-section {
    margin-bottom: 20px;
}

.table-section {
    margin-bottom: 20px;
}

.pagination-section {
    margin-bottom: 0;
    padding-bottom: 0;
}

/* 加粗对话框标题 */
:deep(.el-dialog__title) {
    font-weight: 600;
    font-size: 18px;
    color: #303133;
}

/* 设置对话框内边距 */
:deep(.el-dialog) {
    --el-dialog-padding-primary: 20px;
}

/* 表格样式优化 */
:deep(.el-table) {
    border: none;
}

:deep(.el-table__border-top-patch) {
    display: none;
}

:deep(.el-table__border-right-patch) {
    display: none;
}

:deep(.el-table td) {
    border: none;
    border-bottom: 1px solid #f0f0f0;
    padding: 0;
    height: 50px;
}

:deep(.el-table th) {
    border: none;
    height: 50px;
    padding-left: 12px;
}

:deep(.el-table__row) {
    height: 50px;
}

:deep(.el-table__row:last-child td) {
    border-bottom: none;
}

:deep(.el-table__cell) {
    border: none;
    padding: 0;
}

:deep(.el-table--border) {
    border: none;
}

:deep(.el-table--border::after) {
    display: none;
}

:deep(.el-table--border::before) {
    display: none;
}
</style>