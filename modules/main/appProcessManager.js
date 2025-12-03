const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const { getAppPath } = require('./pathManager');

/**
 * App进程管理器
 * 用于启动和管理独立的App进程
 */
class AppProcessManager {
    constructor() {
        this.appProcesses = new Map(); // 存储App进程 {appId: childProcess}
    }

    /**
     * 启动App进程
     * @param {string} appId - App ID
     * @param {boolean} devTag - 是否为开发模式
     * @param {Object} options - 额外选项
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async startAppProcess(appId, devTag = false, options = {}) {
        try {
            // 检查App是否已经运行
            if (this.appProcesses.has(appId)) {
                const existingProcess = this.appProcesses.get(appId);
                if (!existingProcess.killed) {
                    logger.info(`App ${appId} is already running`);
                    return { success: false, msg: 'App is already running' };
                }
                // 清理已结束的进程
                this.appProcesses.delete(appId);
            }

            // 获取App信息
            const { getAppsStore, getAppsDevStore } = require('./storageManager');
            const appItem = devTag
                ? getAppsDevStore().get('default')[appId]
                : getAppsStore().get('default')[appId];

            if (!appItem) {
                return { success: false, msg: 'App not found' };
            }

            const appPath = devTag 
                ? appItem.path 
                : path.join(getAppPath(), appId + '.asar');

            const appJson = devTag
                ? JSON.parse(fs.readFileSync(path.join(appItem.path, 'app.json'), 'utf8'))
                : JSON.parse(fs.readFileSync(path.join(getAppPath(), appId + '.asar/app.json'), 'utf8'));

            // 设置环境变量
            const env = {
                ...process.env,
                APP_ID: appId,
                APP_NAME: appJson.name || appId,
                ELECTRON_WM_CLASS: `canbox-${appId}`, // 设置唯一的WM_CLASS
                APP_PATH: appPath,
                IS_DEV_MODE: devTag.toString(),
                CANBOX_MAIN_PID: process.pid.toString()
            };

            // 构建启动参数
            const appArgs = [
                path.join(__dirname, 'app-main.js'),
                `--app-id=${appId}`,
                `--app-name=${appJson.name || appId}`,
                `--wm-class=canbox-${appId}`,
                '--no-sandbox'  // 添加 --no-sandbox 参数以避免权限问题
            ];

            if (devTag) {
                appArgs.push('--dev-mode');
            }

            // 启动App进程
            const appProcess = spawn(process.execPath, appArgs, {
                env,
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false
            });

            // 处理进程输出
            appProcess.stdout?.on('data', (data) => {
                logger.info(`App ${appId} stdout: ${data.toString().trim()}`);
            });

            appProcess.stderr?.on('data', (data) => {
                logger.error(`App ${appId} stderr: ${data.toString().trim()}`);
            });

            // 处理进程退出
            appProcess.on('close', (code, signal) => {
                logger.info(`App ${appId} process closed with code ${code}, signal ${signal}`);
                this.appProcesses.delete(appId);
            });

            appProcess.on('error', (error) => {
                logger.error(`App ${appId} process error: ${error.message}`);
                this.appProcesses.delete(appId);
            });

            // 存储进程引用
            this.appProcesses.set(appId, appProcess);

            logger.info(`App ${appId} started successfully with PID: ${appProcess.pid}`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to start app ${appId}:`, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 停止App进程
     * @param {string} appId - App ID
     * @returns {Promise<{success: boolean, msg?: string}>}
     */
    async stopAppProcess(appId) {
        try {
            if (!this.appProcesses.has(appId)) {
                return { success: false, msg: 'App process not found' };
            }

            const appProcess = this.appProcesses.get(appId);

            // 尝试优雅关闭
            appProcess.kill('SIGTERM');

            // 等待一段时间后强制关闭
            setTimeout(() => {
                if (!appProcess.killed) {
                    appProcess.kill('SIGKILL');
                }
            }, 5000);

            this.appProcesses.delete(appId);
            logger.info(`App ${appId} stopped`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to stop app ${appId}:`, error);
            return { success: false, msg: error.message };
        }
    }

    /**
     * 检查App是否正在运行
     * @param {string} appId - App ID
     * @returns {boolean}
     */
    isAppRunning(appId) {
        const process = this.appProcesses.get(appId);
        return process && !process.killed;
    }

    /**
     * 获取所有运行中的App
     * @returns {string[]}
     */
    getRunningApps() {
        return Array.from(this.appProcesses.keys()).filter(id => this.isAppRunning(id));
    }

    /**
     * 停止所有App进程
     */
    async stopAllApps() {
        const runningApps = this.getRunningApps();
        const stopPromises = runningApps.map(id => this.stopAppProcess(id));
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
        await this.stopAppProcess(appId);
        // 等待一段时间确保进程完全退出
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.startAppProcess(appId, devTag);
    }
}

// 创建单例实例
const appProcessManager = new AppProcessManager();

module.exports = appProcessManager;