<template>
    <el-dialog :modelValue="translationStore.dialogVisible" @update:modelValue="translationStore.setDialogVisible"
        :title="t('translation.translationResult')" width="70%">
        <el-form label-position="top">
            <el-form-item>
                <el-table :data="translationStore.translationResult" style="width: 100%" height="450" empty-text=""
                    v-loading="translationStore.loadingStates.translation"
                    :element-loading-text="translationStore.getStatusText()">
                    <el-table-column prop="en" label="EN">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.en" :isEditing="row.editing_en"
                                @enterEdit="translationStore.enterEditMode($index, 'en')"
                                @exitEdit="row.editing_en = false" @update:value="row.en = $event"
                                @save="() => handleSaveTranslation($index)" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="cn" label="CN">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.cn" :isEditing="row.editing_cn"
                                @enterEdit="translationStore.enterEditMode($index, 'cn')"
                                @exitEdit="row.editing_cn = false" @update:value="row.cn = $event"
                                @save="() => handleSaveTranslation($index)" />
                        </template>
                    </el-table-column>
                    <el-table-column prop="jp" label="JP">
                        <template #default="{ row, $index }">
                            <EditableCell :value="row.jp" :isEditing="row.editing_jp"
                                @enterEdit="translationStore.enterEditMode($index, 'jp')"
                                @exitEdit="row.editing_jp = false" @update:value="row.jp = $event"
                                @save="() => handleSaveTranslation($index)" />
                        </template>
                    </el-table-column>
                    <el-table-column fixed="right" :label="t('common.operation')" width="120">
                        <template #default="{ row }">
                            <div class="operation-container">
                                <el-popover trigger="hover" placement="right-start" :show-arrow="false" :offset="5"
                                    width="auto" popper-style="padding: 8px 0;  min-width: 250px;"
                                    @hide="translationStore.handlePopoverHide">
                                    <template #reference>
                                        <el-icon>
                                            <MoreFilled />
                                        </el-icon>
                                    </template>
                                    <div class="user-suggestion" v-if="translationStore.userSuggestionVisible">
                                        <el-input type="textarea" :modelValue="translationStore.userSuggestion"
                                            @update:modelValue="translationStore.setUserSuggestion"
                                            :autosize="{ minRows: 2 }" :placeholder="t('translation.userSuggestionPlaceholder')
                                                " />
                                        <el-row justify="end" style="margin-top: 10px">
                                            <el-button plain size="small" style="min-width: 64px"
                                                @click="translationStore.handleUseSuggestionCancel()">{{
                                                    t("common.cancel") }}</el-button>
                                            <el-button type="primary" size="small" style="min-width: 64px"
                                                @click="translationStore.handleUseSuggestion()">{{
                                                    t("common.retry") }}</el-button>
                                        </el-row>
                                    </div>
                                    <div class="operation-list" v-if="!translationStore.userSuggestionVisible">
                                        <div class="operation-list-item" @click="translationStore.handleDelete(row)">
                                            Delete
                                        </div>
                                    </div>
                                </el-popover>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>
            </el-form-item>
            <div class="dialog-button-container">
                <el-button @click="translationStore.closeDialog()">{{
                    t("common.cancel")
                }}</el-button>
                <el-button type="primary" @click="translationStore.exportExcel"
                    :disabled="translationStore.isTranslating">{{
                        t("translation.exportExcel")
                    }}</el-button>
                <el-button type="primary" @click="translationStore.uploadToLokalise"
                    :disabled="translationStore.isTranslating">{{
                        t("translation.uploadToLokalise") }}</el-button>
            </div>
        </el-form>
    </el-dialog>
</template>

<script setup>
import EditableCell from "../Common/EditableCell.vue";
import { useI18n } from "../../composables/Core/useI18n.js";
import { useTranslationStore } from "../../stores/translation/index.js";
import { MoreFilled } from "@element-plus/icons-vue";

const { t } = useI18n();

// 使用翻译Store
const translationStore = useTranslationStore();

// 处理保存翻译结果
const handleSaveTranslation = (index) => {
    // 更新本地存储中的翻译结果
    const translationData = translationStore.translationResult.map((item) => ({
        en: item.en,
        cn: item.cn,
        jp: item.jp,
    }));
    translationStore.saveTranslationToLocal(translationData);
};
</script>

<style lang="scss" scoped>
.user-suggestion {
    padding: 8px 16px;
}

.operation-container {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    width: 100%;
    padding-right: 20px;
    cursor: pointer;

    .el-icon {
        transform: rotate(90deg);
    }
}

.operation-list {
    display: flex;
    flex-direction: column;

    .operation-list-item {
        padding: 8px 16px;
        cursor: pointer;

        &:hover {
            color: #409eff;
            background-color: #f5f7fa;
        }
    }
}

.dialog-button-container {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

/* 对话框表单样式 */
:deep(.el-dialog .el-form) {
    margin: 0;
}

:deep(.el-dialog .el-form-item) {
    margin-bottom: 20px;
}

:deep(.el-dialog .el-form-item:last-child) {
    margin-bottom: 0;
}

:deep(.el-dialog .el-form-item__label) {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
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

:deep(.el-dialog__body) {
    padding: 0px;
}
</style>
