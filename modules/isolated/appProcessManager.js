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
     * @param {boolean} devTag app开发tag，true：当前是开发app
     * @returns {boolean} - 是否成功
     */
    startApp(uid, devTag) {
        try {
            // 验证必要参数
            if (!uid) {
                logger.error('uid is required');
                return false;
            }

            // 检查App是否已运行
            if (this.isAppRunning(uid)) {
                logger.info(`App ${uid} is already running`);
                return true;
            }

            // 获取应用信息
            const appItem = devTag
                ? getAppsDevStore().get('default')[uid]
                : getAppsStore().get('default')[uid];
                
            if (!appItem) {
                logger.error(`App ${uid} not found`);
                return false;
            }

            // 加载应用配置
            const appPath = devTag ? appItem.path : path.join(getAppPath(), uid + '.asar');
            const appJson = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf8'));

            // 加载开发配置
            const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
                ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
                : null;

            // 确定主入口文件
            const appMain = devTag && uatDevJson?.main ? uatDevJson.main : appJson.main;
            
            // 构建启动参数
            const args = [
                '--app-id=' + uid,
                '--app-path=' + appPath,
                '--app-main=' + appMain
            ];

            // 开发模式添加额外参数
            if (devTag) {
                args.push('--dev-mode');
                if (uatDevJson?.devTools) {
                    args.push('--dev-tools=' + uatDevJson.devTools);
                }
            }

            // 创建子进程
            const appProcess = spawn(process.execPath, [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu-sandbox',
                path.join(__dirname, 'app-main.js'),
                ...args
            ], {
                stdio: ['ignore', 'pipe', 'pipe'],
                detached: false,
                env: {
                    ...process.env,
                    CANBOX_APP_ID: uid,
                    CANBOX_APP_PATH: appPath,
                    CANBOX_DEV_MODE: devTag ? 'true' : 'false'
                }
            });

            // 处理进程输出
            appProcess.stdout?.on('data', (data) => {
                logger.info(`[${uid}] ${data.toString().trim()}`);
            });

            appProcess.stderr?.on('data', (data) => {
                logger.error(`[${uid}] ${data.toString().trim()}`);
            });

            // 处理进程退出
            appProcess.on('exit', (code, signal) => {
                logger.info(`App ${uid} exited with code ${code}, signal ${signal}`);
                this.processMap.delete(uid);
            });

            appProcess.on('error', (error) => {
                logger.error(`Failed to start app ${uid}:`, error);
                this.processMap.delete(uid);
            });

            // 存储进程引用
            this.processMap.set(uid, appProcess);
            logger.info(`App ${uid} started successfully`);

            return true;

        } catch (error) {
            logger.error(`Failed to start app ${uid}:`, error);
            return false;
        }
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