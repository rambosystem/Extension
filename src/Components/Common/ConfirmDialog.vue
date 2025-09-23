<template>
    <el-dialog v-model="visible" :title="title" width="30%" top="30vh">
        <span>{{ message }}</span>
        <template #footer>
            <el-button @click="handleCancel">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleConfirm">
                {{ t('common.confirm') }}
            </el-button>
        </template>
    </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useI18n } from '../../composables/useI18n.js';

const { t } = useI18n();

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const visible = ref(false);

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
    visible.value = newValue;
});

// 监听 visible 变化
watch(visible, (newValue) => {
    emit('update:modelValue', newValue);
});

const handleConfirm = () => {
    visible.value = false;
    emit('confirm');
};

const handleCancel = () => {
    visible.value = false;
    emit('cancel');
};
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>