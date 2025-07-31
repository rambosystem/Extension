<template>
    <div class="loading-button-container">
        <el-icon v-if="loading" class="loading-icon">
            <Loading />
        </el-icon>
        <span @click="handleClick" class="button-text" :class="{ disabled: loading }">
            <slot>{{ text }}</slot>
        </span>
    </div>
</template>

<script setup>
import { Loading } from "@element-plus/icons-vue";

const props = defineProps({
    loading: {
        type: Boolean,
        default: false
    },
    text: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['click']);

const handleClick = () => {
    if (!props.loading) {
        emit('click');
    }
};
</script>

<style lang="scss" scoped>
.loading-button-container {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;

    .loading-icon {
        animation: rotate 1s linear infinite;
    }

    .button-text {
        color: #409EFF;
        font-size: 14px;
        transition: all 0.2s ease;

        &:hover {
            text-decoration: underline;
        }

        &.disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }
    }
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}
</style>