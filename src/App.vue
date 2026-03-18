<script setup>
import { onMounted, ref, nextTick } from 'vue';
import UpdateDialog from '@/components/UpdateDialog.vue';
import { useUpdateStore } from '@/stores/updateStore';

/**
 * 使用更新状态管理
 */
const updateStore = useUpdateStore();

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
 * 处理退出（AppImage 模式）
 */
const handleExitApp = async () => {
    try {
        const result = await window.api.quit();
        if (!result.success) {
            console.error('[App.vue] 退出应用失败:', result.error);
        }
    } catch (error) {
        console.error('[App.vue] 退出应用异常:', error);
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
        updateStore.resetDownloadState();
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
        updateStore.clearUpdateStatus();
    } catch (error) {
        console.error('[App.vue] 跳过版本异常:', error);
    }
};

/**
 * 处理重试
 */
const handleRetry = async () => {
    updateStore.resetDownloadState();
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

        // 监听发现新版本事件 - 静默通知，不弹出对话框
        window.api.on('update-available', (event, info) => {
            console.log('[App.vue] 发现新版本:', info.version);
            updateStore.setUpdateAvailable(info);
        });

        // 监听显示更新对话框事件 - 由用户点击"关于"页面的升级按钮触发
        window.api.on('show-update-dialog', (event) => {
            console.log('[App.vue] 显示更新对话框');
            updateInfo.value = updateStore.updateInfo;
            updateDialogVisible.value = true;
        });

        // 监听更新不可用事件
        window.api.on('update-not-available', (event, version) => {
            console.log('[App.vue] 当前已是最新版本:', version);
            updateStore.clearUpdateStatus();
        });

        // 监听下载完成事件（通用平台）
        window.api.on('update-downloaded', (event, info) => {
            console.log('[App.vue] 更新下载完成（通用平台）:', info.version);
            updateStore.setDownloaded(info);
            updateInfo.value = info;
        });

        // 监听下载完成事件（Linux AppImage - 需要手动重启）
        window.api.on('update-downloaded-restart', (event, info) => {
            console.log('[App.vue] 更新下载完成（Linux AppImage）:', info.version);
            updateStore.setDownloaded(info);
            updateInfo.value = info;
        });

        // 监听下载进度事件
        window.api.on('download-progress', (event, progress) => {
            console.log('[App.vue] 下载进度:', progress.percent);
            updateStore.setDownloadInfo(progress);
        });

        // 监听更新错误事件 - 错误仍需要弹出对话框
        window.api.on('update-error', (event, error) => {
            console.error('[App.vue] 更新错误:', error);
            updateInfo.value = error;
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
        @exit="handleExitApp"
        @cancel="handleCancelDownload"
        @skip="handleSkipVersion"
        @retry="handleRetry"
    />
</template>
