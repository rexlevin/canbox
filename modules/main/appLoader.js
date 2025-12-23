const { BrowserWindow, session, BaseWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logger = require('@modules/utils/logger');
const ObjectUtils = require('@modules/utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

const { getAppsStore, getAppsDevStore, getCanboxStore } = require('@modules/main/storageManager');
const { getAppPath } = require('@modules/main/pathManager');
const appWindowManager = require('@modules/integrated/appWindowManager');
const appProcessManager = require('@modules/isolated/appProcessManager');

const { handleError } = require('@modules/ipc/errorHandler')

const appLoader = {

    /**
     * 根据appId直接打开app
     * 
     * @param {String} appItemStr app应用uid
     * @param {boolean} devTag app开发tag，true：当前是开发app
     * @param {boolean} useSeparateProcess 是否使用独立进程模式（可选，默认从配置读取）
     * @returns void
     */
    loadApp: async (uid, devTag, useSeparateProcess = null) => {
    
        if (!uid) {
            return handleError(new Error('uid is required'), 'loadApp');
        }
    
        // 如果没有指定 useSeparateProcess，从配置读取
        if (useSeparateProcess === null) {
            try {
                const canboxStore = getCanboxStore();
                const launchMode = canboxStore.get('appLaunchMode', 'window');
                
                // 根据启动模式决定是否使用独立进程
                switch (launchMode) {
                    case 'process':
                        useSeparateProcess = true;
                        break;
                    case 'window':
                        useSeparateProcess = false;
                        break;
                    case 'follow':
                        // 跟随系统
                        useSeparateProcess = process.platform === 'linux' ? true : false;
                        break;
                    default:
                        useSeparateProcess = process.platform === 'linux' ? true : false;
                }
            } catch (error) {
                logger.error('Failed to read app launch mode, using default: {}', error);
                useSeparateProcess = process.platform === 'linux' ? true : false;
            }
        }
        // useSeparateProcess = false;
        logger.info('App {}, useSeparateProcess: {}', uid, useSeparateProcess);
        const appManager = useSeparateProcess ? appProcessManager : appWindowManager;
        // 检查 App 是否已运行
        if (appManager.isAppRunning(uid)) {
            appManager.focusApp(uid);
            logger.info('App {} is already running', uid);
            return;
        }

        // 启动 App
        const result = appManager.startApp(uid, devTag);

    }

};

module.exports = appLoader;