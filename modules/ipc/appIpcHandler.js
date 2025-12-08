const appProcessManager = require('@modules/isolated/appProcessManager');
const logger = require('@modules/utils/logger');

class AppIpcHandler {
    constructor() {
        this.handlers = new Map();
        this.registerHandlers();
    }

    registerHandlers() {
        // 启动App进程
        this.handlers.set('start-app-process', async (event, { appId, devTag }) => {
            try {
                const result = await appProcessManager.startAppProcess(appId, devTag);
                return result;
            } catch (error) {
                logger.error('IPC start-app-process error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 停止App进程
        this.handlers.set('stop-app-process', async (event, { appId }) => {
            try {
                const result = await appProcessManager.stopAppProcess(appId);
                return result;
            } catch (error) {
                logger.error('IPC stop-app-process error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 重启App进程
        this.handlers.set('restart-app-process', async (event, { appId, devTag }) => {
            try {
                const result = await appProcessManager.restartAppProcess(appId, devTag);
                return result;
            } catch (error) {
                logger.error('IPC restart-app-process error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 检查App是否运行
        this.handlers.set('is-app-running', async (event, { appId }) => {
            try {
                const isRunning = appProcessManager.isAppRunning(appId);
                return { success: true, data: { isRunning } };
            } catch (error) {
                logger.error('IPC is-app-running error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 获取所有运行中的App
        this.handlers.set('get-running-apps', async () => {
            try {
                const runningApps = appProcessManager.getRunningApps();
                return { success: true, data: { runningApps } };
            } catch (error) {
                logger.error('IPC get-running-apps error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 停止所有App
        this.handlers.set('stop-all-apps', async () => {
            try {
                await appProcessManager.stopAllApps();
                return { success: true };
            } catch (error) {
                logger.error('IPC stop-all-apps error:', error);
                return { success: false, msg: error.message };
            }
        });
    }

    /**
     * 初始化 IPC 处理器
     * @param {Electron.IpcMain} ipcMain 
     */
    init(ipcMain) {
        for (const [channel, handler] of this.handlers) {
            ipcMain.handle(channel, handler);
            logger.info(`Registered IPC handler: ${channel}`);
        }
    }
}

module.exports = new AppIpcHandler();