<script setup>
import { onMounted, ref, nextTick } from 'vue';
import UpdateDialog from '@/components/UpdateDialog.vue';

/**
 * 自动更新对话框可见性
 */
const updateDialogVisible = ref(false);

/**
 * 自动更新信息
 */
const updateInfo = ref(null);

/**
 * 处理下载更新
 */
const handleDownloadUpdate = async () => {
    try {
        const result = await window.api.autoUpdate.downloadUpdate();
        if (!result.success) {
            console.error('[App.vue] 下载更新失败:', result.error);
        }
    } catch (error) {
        console.error('[App.vue] 下载更新异常:', error);
    }
};

/**
 * 处理安装更新
 */
const handleInstallUpdate = async () => {
    try {
        const result = await window.api.autoUpdate.installUpdate();
        if (!result.success) {
            console.error('[App.vue] 安装更新失败:', result.error);
        }
    } catch (error) {
        console.error('[App.vue] 安装更新异常:', error);
    }
};

/**
 * 处理取消下载
 */
const handleCancelDownload = async () => {
    try {
        const result = await window.api.autoUpdate.cancelDownload();
        if (!result.success) {
            console.error('[App.vue] 取消下载失败:', result.error);
        }
    } catch (error) {
        console.error('[App.vue] 取消下载异常:', error);
    }
};

/**
 * 处理跳过版本
 */
const handleSkipVersion = async (version) => {
    try {
        const result = await window.api.autoUpdate.skipVersion(version);
        if (!result.success) {
            console.error('[App.vue] 跳过版本失败:', result.error);
        }
    } catch (error) {
        console.error('[App.vue] 跳过版本异常:', error);
    }
};

/**
 * 处理重试
 */
const handleRetry = async () => {
    await handleDownloadUpdate();
};

/**
 * 组件挂载后初始化
 * 注册自动更新事件监听器
 */
onMounted(() => {
    // 使用 nextTick 确保在下一个 tick 中执行，避免初始化顺序问题
    nextTick(() => {
        // 检查 window.api 是否可用
        if (!window.api) {
            console.warn('[App.vue] window.api 不可用，跳过自动更新事件监听器注册');
            return;
        }

        // 监听发现新版本事件
        window.api.on('update-available', (event, info) => {
            console.log('[App.vue] 发现新版本:', info.version);
            updateInfo.value = info;
            updateDialogVisible.value = true;
        });

        // 监听更新错误事件
        window.api.on('update-error', (event, error) => {
            console.error('[App.vue] 更新错误:', error);
            updateInfo.value = null;
            updateDialogVisible.value = true;
        });

        console.log('[App.vue] 自动更新事件监听器已注册');
    });
});
</script>

<template>
    <router-view></router-view>
    <UpdateDialog
        v-model="updateDialogVisible"
        :updateInfo="updateInfo"
        @download="handleDownloadUpdate"
        @install="handleInstallUpdate"
        @cancel="handleCancelDownload"
        @skip="handleSkipVersion"
        @retry="handleRetry"
    />
</template>
