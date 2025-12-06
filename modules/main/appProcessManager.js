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
            logger.info(`App ${appId} will start in separate process...`);

            // 获取App信息
            const { getAppsStore, getAppsDevStore } = require('./storageManager');
            const appItem = devTag
                ? getAppsDevStore().get('default')[appId]
                : getAppsStore().get('default')[appId];

            if (!appItem) {
                return { success: false, msg: 'App not found' };
            }
            logger.info(`App ${appId} found, appItem: {}`, JSON.stringify(appItem));

            const appPath = devTag 
                ? appItem.path 
                : path.join(getAppPath(), appId + '.asar');

            const appJson = devTag
                ? JSON.parse(fs.readFileSync(path.join(appItem.path, 'app.json'), 'utf8'))
                : JSON.parse(fs.readFileSync(path.join(getAppPath(), appId + '.asar/app.json'), 'utf8'));

            // 构建窗口配置字符串并传递给子进程
            let windowConfig = {};
            if (appJson.window) {
                windowConfig = { ...appJson.window };
                
                // 处理图标路径
                if (windowConfig.icon) {
                    windowConfig.icon = path.resolve(appPath, windowConfig.icon);
                } else {
                    windowConfig.icon = path.resolve(appPath, appJson.logo);
                }
                if (!devTag) {
                    const logoExt = path.extname(appJson.logo);
                    windowConfig.icon = path.resolve(getAppPath(), `${appId}${logoExt}`);
                }
                
                // 处理 preload 路径
                if (windowConfig.webPreferences?.preload) {
                    windowConfig.webPreferences.preload = path.resolve(appPath, windowConfig.webPreferences.preload);
                }
            }

            // 设置环境变量
            const env = {
                ...process.env,
                APP_ID: appId,
                APP_NAME: appJson.name || appId,
                ELECTRON_WM_CLASS: `canbox-${appId}`, // 设置唯一的WM_CLASS
                APP_PATH: appPath,
                IS_DEV_MODE: devTag.toString(),
                CANBOX_MAIN_PID: process.pid.toString(),
                APP_WINDOW_CONFIG: JSON.stringify(windowConfig), // 传递窗口配置
                APP_JSON: JSON.stringify(appJson) // 传递完整的 app.json
            };

            // 构建启动参数
            const appMainPath = path.join(__dirname, 'app-main.js');
            
            const appArgs = [
                appMainPath,
                `--app-id=${appId}`,
                `--app-name=${appJson.name || appId}`,
                `--wm-class=canbox-${appId}`,
                '--no-sandbox'  // 添加 --no-sandbox 参数以避免权限问题
            ];

            if (devTag) {
                appArgs.push('--dev-mode');
            }

            // 启动App进程 - 回到 spawn 但确保使用正确的 Electron 环境
            
            // 创建一个临时文件来启动 app-main.js
            const os = require('os');
            const tempDir = os.tmpdir();
            const tempScriptPath = path.join(tempDir, `canbox-app-${appId}-${Date.now()}.js`);
            let appProcess;
            
            // 创建临时启动脚本
            const tempScript = `
// 临时启动脚本
const { app } = require('electron');

// 设置环境变量
process.env.APP_ID = '${appId}';
process.env.APP_NAME = '${appJson.name || appId}';
process.env.ELECTRON_WM_CLASS = 'canbox-${appId}';
process.env.APP_PATH = '${appPath}';
process.env.IS_DEV_MODE = '${devTag}';
process.env.CANBOX_MAIN_PID = '${process.pid}';
process.env.APP_WINDOW_CONFIG = '${JSON.stringify(windowConfig).replace(/'/g, "\\'")}';
process.env.APP_JSON = '${JSON.stringify(appJson).replace(/'/g, "\\'")}';

// 在 app ready 之前加载 app-main.js，以便 app.disableHardwareAcceleration() 能正常执行
try {
    require('${appMainPath}');
} catch (error) {
    // 如果是因为 app 已经 ready 导致的错误，继续执行
    if (error.message.includes('app is ready') || error.message.includes('before app is ready')) {
        // App is already ready, continue...
    } else {
        // 其他错误则退出
        app.whenReady().then(() => {
            app.quit();
        });
    }
}

// 处理窗口关闭
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
`;
            
            try {
                const fs = require('fs');
                fs.writeFileSync(tempScriptPath, tempScript);
                
                // 直接用 Electron 运行临时脚本
                const electronPath = process.execPath;
                
                // 使用 Electron 直接运行临时脚本，添加 --no-sandbox 参数
                appProcess = spawn(electronPath, [tempScriptPath, '--no-sandbox'], {
                    env,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    detached: false
                });
                
                // 清理临时文件的逻辑
                appProcess.on('close', () => {
                    try {
                        fs.unlinkSync(tempScriptPath);
                        console.log('Cleaned up temporary script:', tempScriptPath);
                    } catch (error) {
                        console.error('Failed to clean up temporary script:', error);
                    }
                });
            } catch (error) {
                console.error('Failed to create temporary script:', error);
                throw error;
            }

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