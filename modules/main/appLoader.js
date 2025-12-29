const { BrowserWindow, session, BaseWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logger = require('@modules/utils/logger');
const ObjectUtils = require('@modules/utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath } = require('@modules/main/pathManager');
const appWindowManager = require('@modules/integrated/appWindowManager');

const { handleError } = require('@modules/ipc/errorHandler')

const appLoader = {

    /**
     * 根据appId直接打开app
     * 
     * @param {String} uid app应用uid
     * @param {boolean} devTag app开发tag，true：当前是开发app
     * @returns void
     */
    loadApp: async (uid, devTag) => {
    
        if (!uid) {
            return handleError(new Error('uid is required'), 'loadApp');
        }
    
        logger.info('Loading app {}', uid);
        
        // 检查 App 是否已运行
        if (appWindowManager.isAppRunning(uid)) {
            appWindowManager.focusApp(uid);
            logger.info('App {} is already running', uid);
            return;
        }

        // 启动 App
        const result = appWindowManager.startApp(uid, devTag);

    }

};

module.exports = appLoader;