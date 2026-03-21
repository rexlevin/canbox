import { defineStore } from 'pinia';

export const useUpdateStore = defineStore('update', {
    state: () => ({
        hasUpdate: false,           // 是否有可更新版本
        updateInfo: null,           // 更新信息对象
        isDownloading: false,       // 是否正在下载
        isInstalling: false,        // 是否正在安装
        downloadProgress: 0,        // 下载进度 0-100
        downloadSpeed: 0,           // 下载速度 (bytes/s)
        downloadTransferred: 0,     // 已下载字节数
        downloadTotal: 0,           // 总字节数
        lastCheckTime: null,        // 上次检查时间
        lastCheckVersion: null,     // 上次检查的版本
        hasError: false,           // 是否有错误
        errorInfo: null,           // 错误信息对象 { code, message, details, timestamp }
        consecutiveFailures: 0,     // 连续失败次数
    }),

    getters: {
        // 格式化下载进度显示
        progressPercentage: (state) => {
            return state.downloadProgress.toFixed(0);
        },

        // 格式化下载速度
        formattedDownloadSpeed: (state) => {
            const speed = state.downloadSpeed;
            if (speed < 1024) return `${speed.toFixed(0)} B/s`;
            if (speed < 1024 * 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
            return `${(speed / (1024 * 1024)).toFixed(2)} MB/s`;
        },

        // 格式化已下载/总大小
        formattedDownloadSize: (state) => {
            const formatBytes = (bytes) => {
                if (bytes < 1024) return `${bytes.toFixed(0)} B`;
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
            };
            return `${formatBytes(state.downloadTransferred)} / ${formatBytes(state.downloadTotal)}`;
        },
    },

    actions: {
        // 收到更新可用事件
        setUpdateAvailable(info) {
            this.hasUpdate = true;
            this.updateInfo = info;
        },

        // 清除更新状态（用户忽略/安装完成）
        clearUpdateStatus() {
            this.hasUpdate = false;
            this.updateInfo = null;
        },

        // 更新下载进度
        setDownloadProgress(progress) {
            this.downloadProgress = progress;
            this.isDownloading = progress > 0 && progress < 100;
        },

        // 设置下载详细信息
        setDownloadInfo({ percent, bytesPerSecond, transferred, total }) {
            this.downloadProgress = percent;
            this.downloadSpeed = bytesPerSecond;
            this.downloadTransferred = transferred;
            this.downloadTotal = total;
            this.isDownloading = percent > 0 && percent < 100;
        },

        // 开始安装
        setInstalling(isInstalling) {
            this.isInstalling = isInstalling;
        },

        // 下载完成
        setDownloaded(updateInfo) {
            this.isDownloading = false;
            this.downloadProgress = 100;
            this.updateInfo = updateInfo;
        },

        // 更新检查时间
        setLastCheck(version) {
            this.lastCheckTime = new Date().toISOString();
            this.lastCheckVersion = version;
        },

        // 重置下载状态
        resetDownloadState() {
            this.isDownloading = false;
            this.downloadProgress = 0;
            this.downloadSpeed = 0;
            this.downloadTransferred = 0;
            this.downloadTotal = 0;
        },

        // 设置错误信息
        setError(error) {
            this.hasError = true;
            this.errorInfo = {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message || 'Unknown error',
                details: error.details || null,
                timestamp: new Date().toISOString()
            };
            this.consecutiveFailures++;
        },

        // 清除错误信息
        clearError() {
            this.hasError = false;
            this.errorInfo = null;
            this.consecutiveFailures = 0;
        }
    }
});
