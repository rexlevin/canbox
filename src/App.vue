<script setup>
import { onMounted, ref, nextTick } from 'vue';
import UpdateDialog from '@/components/UpdateDialog.vue';

/**
 * 自动更新对话框引用
 */
const updateDialogRef = ref(null);

/**
 * 组件挂载后初始化
 * 注册自动更新事件监听器
 */
onMounted(() => {
    // 使用 nextTick 确保在下一个 tick 中执行，避免初始化顺序问题
    nextTick(() => {
        // 检查 window.electron 是否可用（开发环境可能不可用）
        if (!window.electron || !window.electron.ipcRenderer) {
            console.warn('[App.vue] window.electron 不可用，跳过自动更新事件监听器注册');
            return;
        }

        // 监听发现新版本事件
        window.electron.ipcRenderer.on('update-available', (event, updateInfo) => {
            console.log('[App.vue] 发现新版本:', updateInfo);
            if (updateDialogRef.value) {
                updateDialogRef.value.show(updateInfo);
            }
        });

        // 监听更新错误事件
        window.electron.ipcRenderer.on('update-error', (event, error) => {
            console.error('[App.vue] 更新错误:', error);
            if (updateDialogRef.value) {
                updateDialogRef.value.showError(error);
            }
        });

        console.log('[App.vue] 自动更新事件监听器已注册');
    });
});
</script>

<template>
    <router-view></router-view>
    <UpdateDialog ref="updateDialogRef" />
</template>
