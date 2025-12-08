const path = require('path');
const fs = require('fs');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath } = require('@modules/main/pathManager');
const logger = require('@modules/utils/logger');

class AppManagerIpcHandler {
    constructor() {
        this.handlers = new Map();
        this.registerHandlers();
    }

    registerHandlers() {
        // 获取所有应用（异步版本，避免阻塞主线程）
        this.handlers.set('get-all-apps', async () => {
            const startTime = Date.now();
            try {
                const appsData = getAppsStore().get('default') || {};
                const appCount = Object.keys(appsData).length;
                logger.info(`IPC get-all-apps: Starting to process ${appCount} apps`);
                
                if (appCount === 0) {
                    logger.info('当前没有应用数据');
                    return { success: true, data: {}};
                }

                // 使用异步并发读取所有应用的 app.json 文件
                const readStartTime = Date.now();
                const appPromises = Object.entries(appsData).map(async ([uid, appItem]) => {
                    try {
                        const appJsonPath = path.join(getAppPath(), uid + '.asar/app.json');
                        const appJsonContent = await fs.promises.readFile(appJsonPath, 'utf8');
                        const appJson = JSON.parse(appJsonContent);
                        const iconPath = path.join(getAppPath(), uid + '.asar', appJson.logo);
                        const appJsonData = { ...appJson, logo: iconPath };
                        return [uid, { ...appItem, appJson: appJsonData }];
                    } catch (error) {
                        logger.error(`Failed to read app.json for ${uid}:`, error);
                        return [uid, appItem]; // 保持原始 appItem
                    }
                });

                // 等待所有应用数据读取完成
                const resolvedApps = await Promise.all(appPromises);
                const readTime = Date.now() - readStartTime;
                
                // 重新构建 appsData 对象
                const buildStartTime = Date.now();
                const updatedAppsData = {};
                resolvedApps.forEach(([uid, appItem]) => {
                    updatedAppsData[uid] = appItem;
                });
                const buildTime = Date.now() - buildStartTime;

                const totalTime = Date.now() - startTime;
                logger.info(`IPC get-all-apps success: ${appCount} apps processed, read: ${readTime}ms, build: ${buildTime}ms, total: ${totalTime}ms`);
                return { success: true, data: updatedAppsData };
            } catch (error) {
                logger.error('IPC get-all-apps error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 获取开发应用数据（异步版本，避免阻塞主线程）
        this.handlers.set('get-apps-dev-data', async () => {
            const startTime = Date.now();
            try {
                let appDevInfoData = getAppsDevStore().get('default') || {};
                const appCount = Object.keys(appDevInfoData).length;
                logger.info(`IPC get-apps-dev-data: Starting to process ${appCount} dev apps`);
                
                if (appCount === 0) {
                    return { success: true, data: {}, wrong: {} };
                }
                
                let appDevData = {};
                let appDevFalseData = {};
                
                // 使用异步并发读取，避免阻塞主线程
                const appPromises = Object.entries(appDevInfoData).map(async ([key, appInfo]) => {
                    try {
                        const appJsonPath = path.join(appInfo.path, 'app.json');
                        const appJsonContent = await fs.promises.readFile(appJsonPath, 'utf8');
                        const appJson = JSON.parse(appJsonContent);
                        
                        // 使用浅拷贝替代深拷贝，性能更好
                        appDevData[key] = { ...appInfo, appJson: { ...appJson } };
                        return { key, success: true };
                    } catch (error) {
                        appDevFalseData[key] = { ...appInfo };
                        return { key, success: false, error };
                    }
                });

                // 等待所有应用数据读取完成
                await Promise.all(appPromises);

                // 异步删除有问题的应用（不阻塞返回）
                if (Object.keys(appDevFalseData).length > 0) {
                    setImmediate(() => {
                        try {
                            for (const key in appDevFalseData) {
                                delete appDevInfoData[key];
                            }
                            getAppsDevStore().set('default', appDevInfoData);
                            logger.info('Cleaned up invalid dev apps:', Object.keys(appDevFalseData));
                        } catch (error) {
                            logger.error('Failed to cleanup invalid dev apps:', error);
                        }
                    });
                }
                
                const totalTime = Date.now() - startTime;
                logger.info(`IPC get-apps-dev-data success: ${appCount} dev apps processed, valid: ${Object.keys(appDevData).length}, invalid: ${Object.keys(appDevFalseData).length}, total: ${totalTime}ms`);
                return { success: true, data: appDevData, wrong: appDevFalseData };
            } catch (error) {
                logger.error('IPC get-apps-dev-data error:', error);
                return { success: false, msg: error.message, data: {}, wrong: {} };
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
        
        // 注册 load-app 处理器（使用 ipcMain.on 因为前端使用 ipcRenderer.send）
        ipcMain.on('load-app', async (event, uid, devTag = false) => {
            try {
                const appWindow = require('@modules/main/app.window');
                await appWindow.loadApp(uid, devTag);
                logger.info('App {} loaded successfully', uid);
            } catch (error) {
                logger.error('Failed to load app {}, error: {}', uid, error);
                event.reply('load-app-error', { uid, error: error.message });
            }
        });
        logger.info('Registered IPC handler: load-app');
    }
}

module.exports = new AppManagerIpcHandler();