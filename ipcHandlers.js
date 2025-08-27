const { ipcMain, dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const winState = require('./modules/main/winState');

const ObjectUtils = require('./modules/utils/ObjectUtils')

const appWindow = require('./modules/main/app.window')

const { getAppDataPath, getAppPath, getAppTempPath } = require('./modules/main/pathManager');
const APP_DATA_PATH = getAppDataPath();
const APP_PATH = getAppPath();
const APP_TEMP_PATH = getAppTempPath();



/**
 * 统一错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文描述
 * @returns {{success: boolean, msg: string}} - 标准化错误返回
 */
function handleError(error, context) {
    console.error(`[${context}] Error:`, error.message);
    return { success: false, msg: error.message };
}



// 导入存储管理模块
const { getAppsStore, getAppsDevStore } = require('./modules/main/storageManager');

// 导入快捷方式管理模块
const shortcutManager = require('./modules/main/shortcutManager');

const AppsConfig = getAppsStore();
const AppsDevConfig = getAppsDevStore();

/**
 * 根据appId直接打开app
 * @param {string} appId 
 */
function handleLoadAppById(appId) {
    const appItem = getAppList().find(item => item.id === appId);
    appWindow.loadApp(JSON.stringify(appItem), null); // 注意：这里需要根据实际逻辑调整参数
}

/**
 * 初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    // 打开文件选择窗口
    ipcMain.on('openAppJson', (event, options) => {
        dialog.showOpenDialog(options).then(result => {
            if (result.canceled) {
                event.returnValue = '';
                return;
            }
            event.returnValue = result.filePaths[0];
        });
    });

    // 使用外部浏览器打开 URL
    ipcMain.on('open-url', (event, url) => {
        shell.openExternal(url).then(res => {
            console.info('open external link:', res);
        }).catch(error => {
            console.error('Error opening external link:', error);
        });
    });

    // 对话框相关 IPC
    ipcMain.handle('show-dialog', async (event, options) => {
        return dialog.showMessageBox(options);
    });

    ipcMain.handle('select-directory', async (event, options) => {
        return dialog.showOpenDialog(options);
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
        return dialog.showSaveDialog(options);
    });

    // 打包 ASAR
    ipcMain.handle('pack-asar', async (event, appDevItemStr) => {
        const appDevItem = JSON.parse(appDevItemStr);
        console.info('main.js==pack-asar appDevItem: ', appDevItem);
        return require('./modules/main/build-asar').buildAsar(appDevItem);
    });

    // 选择文件
    ipcMain.handle('select-file', async (event, options) => {
        return dialog.showOpenDialog({
            ...options,
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
    });

    // 引入应用管理模块
    const appIpcHandler = require('./modules/main/ipc/appIpcHandler');
    appIpcHandler.init();

    // 引入快捷方式管理模块
    const shortcutIpcManager = require('./modules/main/ipc/shortcutIpcHandler');
    shortcutIpcManager.init();

    
}

module.exports = {
    initIpcHandlers,
    handleLoadAppById
};