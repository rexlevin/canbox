const { getAllApps } = require('../appManager');
const { getAppsDevStore } = require('../storageManager');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AppManagerIpcHandler {
    constructor() {
        this.handlers = new Map();
        this.registerHandlers();
    }

    registerHandlers() {
        // 获取所有应用
        this.handlers.set('get-all-apps', async () => {
            try {
                const result = getAllApps();
                logger.info('IPC get-all-apps success');
                return result;
            } catch (error) {
                logger.error('IPC get-all-apps error:', error);
                return { success: false, msg: error.message };
            }
        });

        // 获取开发应用数据
        this.handlers.set('get-apps-dev-data', async () => {
            try {
                const devAppsData = getAppsDevStore().get('default') || {};
                
                // 为每个开发应用添加 appJson 信息
                Object.entries(devAppsData).forEach(([uid, appDevItem]) => {
                    try {
                        const appJsonPath = path.join(appDevItem.path, 'app.json');
                        if (fs.existsSync(appJsonPath)) {
                            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                            appDevItem.appJson = appJson;
                        }
                    } catch (error) {
                        logger.error(`Failed to read app.json for ${uid}:`, error);
                        appDevItem.appJson = {};
                    }
                });
                
                logger.info('IPC get-apps-dev-data success');
                return { success: true, data: devAppsData };
            } catch (error) {
                logger.error('IPC get-apps-dev-data error:', error);
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
        
        // 注册 load-app 处理器（使用 ipcMain.on 因为前端使用 ipcRenderer.send）
        ipcMain.on('load-app', async (event, uid, devTag = false) => {
            try {
                const appWindow = require('../app.window');
                await appWindow.loadApp(uid, devTag);
                logger.info(`App ${uid} loaded successfully`);
            } catch (error) {
                logger.error(`Failed to load app ${uid}:`, error);
                event.reply('load-app-error', { uid, error: error.message });
            }
        });
        logger.info('Registered IPC handler: load-app');
    }
}

module.exports = new AppManagerIpcHandler();