const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('@modules/utils/logger');
const { getAppPath } = require('@modules/main/pathManager');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');

/**
 * App进程管理器
 * 用于启动和管理独立的App进程
 */
class AppProcessManager {
    constructor() {
        this.processMap = new Map(); // 存储App进程 {appId: childProcess}
    }

    /**
     * 启动App进程
     * @param {string} uid - App ID
     * @param {BrowserWindow} appWin - 应用窗口
     * @returns {boolean} - 是否成功
     */
    startApp(uid, appWin) {
    }

    /**
     * 停止App进程
     * @param {string} appId - App ID
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async stopApp(appId) {
        try {
            if (!this.processMap.has(appId)) {
                return { success: false, msg: 'App process not found' };
            }

            const appProcess = this.processMap.get(appId);

            // 尝试优雅关闭
            appProcess.kill('SIGTERM');

            // 等待一段时间后强制关闭
            setTimeout(() => {
                if (!appProcess.killed) {
                    appProcess.kill('SIGKILL');
                }
            }, 5000);

            this.processMap.delete(appId);
            logger.info(`App ${appId} stopped`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to stop app ${appId}:`, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 检查App是否正在运行
     * @param {string} uid - App ID
     * @returns {boolean}
     */
    isAppRunning(uid) {
        const process = this.processMap.get(uid);
        return process && !process.killed;
    }

    /**
     * 聚焦App
     * @param {string} uid App ID
     * @returns {boolean}
     */
    focusApp(uid) {
        const process = this.processMap.get(uid);
        if (!process || process.killed) {
            this.processMap.delete(uid);
            return;
        }
        process.focus();
    }

    /**
     * 获取所有运行中的App
     * @returns {string[]}
     */
    getRunningApps() {
        return Array.from(this.processMap.keys()).filter(id => this.isAppRunning(id));
    }

    /**
     * 停止所有App进程
     */
    async stopAllApps() {
        const runningApps = this.getRunningApps();
        const stopPromises = runningApps.map(id => this.stopApp(id));
        await Promise.allSettled(stopPromises);
        logger.info('All app processes stopped');
    }

    /**
     * 重启App进程
     * @param {string} appId - App ID
     * @param {boolean} devTag - 是否为开发模式
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async restartAppProcess(appId, devTag = false) {
        await this.stopApp(appId);
        // 等待一段时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.startApp(appId, devTag);
    }
}

// 创建单例实例
const appProcessManager = new AppProcessManager();

module.exports = appProcessManager;