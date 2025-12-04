const { getAllApps } = require('../appManager');
const { getAppsDevStore } = require('../storageManager');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const ObjectUtils = require('../../utils/ObjectUtils');

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
            let appDevInfoData = getAppsDevStore().get('default') || {};
            if (!appDevInfoData || Object.keys(appDevInfoData).length === 0) {
                return { correct: {}, wrong: {} };
            }
            
            let appDevData = {} , appDevFalseData = {};
            Object.keys(appDevInfoData).forEach((key) => {
                try {
                    const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfoData[key].path, 'app.json'), 'utf8'));
                    appDevData[key] = ObjectUtils.clone(appDevInfoData[key]);
                    appDevData[key].appJson = ObjectUtils.clone(appJson);
                } catch (error) {
                    appDevFalseData[key] = ObjectUtils.clone(appDevInfoData[key]);
                }
            });

            // 删除有问题的应用
            if (Object.keys(appDevFalseData).length > 0) {
                for (const key in appDevFalseData) {
                    delete appDevInfoData[key];
                }
                getAppsDevStore().set('default', appDevInfoData);
            }
            // console.info('appDevInfoData: ', appDevInfoData);
            // console.info('appDevData: ', appDevData);
            return { correct: appDevData, wrong: appDevFalseData };
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