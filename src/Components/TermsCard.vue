<template>
    <el-card style="width: 100%;" shadow='never' body-style="padding: 16px 20px;">
        <div class="adTerms-content">
            <div class="adTerms-title-container">
                <span class="adTerms-title-text">{{ item.title }}</span>
                <el-switch :model-value="item.status" @update:model-value="handleStatusChange" width="45px" />
            </div>
        </div>
    </el-card>
</template>

<script setup>
const props = defineProps({
    item: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['update:status']);

const handleStatusChange = (value) => {
    emit('update:status', value);
};
</script>

<style lang="scss" scoped>
.adTerms-title-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
}

.adTerms-title-text {
    font-weight: 600;
    font-size: 16px;
    color: #303133;
    flex: 1;
}

.adTerms-content {
    width: 100%;
}
</style>