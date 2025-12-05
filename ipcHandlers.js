const { ipcMain, dialog, shell } = require('electron');
const appIpcHandler = require('./modules/main/ipc/appIpcHandler');
const repoIpcHandler = require('./modules/main/ipc/repoIpcHandler');
const shortcutIpcHandler = require('./modules/main/ipc/shortcutIpcHandler');
const appManagerIpcHandler = require('./modules/main/ipc/appManagerIpcHandler');
const initApiIpcHandlers = require('./modules/main/api');

const appWindow = require('./modules/main/app.window');

/**
 * 根据appId直接打开app
 * @param {string} appId 
 */
function handleLoadAppById(appId) {
    appWindow.loadApp(appId, false); // 注意：这里需要根据实际逻辑调整参数
}

/**
 * 初始化所有 IPC 消息处理逻辑
 */
function initIpcHandlers() {
    // 初始化拆分后的 IPC 处理逻辑
    appIpcHandler.init(ipcMain);
    repoIpcHandler.init(ipcMain);
    shortcutIpcHandler.init(ipcMain);
    appManagerIpcHandler.init(ipcMain);

    // 初始化 API 相关的 IPC 处理逻辑
    initApiIpcHandlers();

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

    // 打包 ASAR
    ipcMain.handle('pack-asar', async (event, uid) => {
        console.info('main.js==pack-asar uid: ', uid);
        return require('./modules/main/build-asar').buildAsar(uid);
    });

    // 选择文件
    ipcMain.handle('select-file', async (event, options) => {
        return dialog.showOpenDialog({
            ...options,
            properties: ['openFile'],
            filters: [{ name: 'App Files', extensions: ['zip'] }],
        });
    });

}

module.exports = {
    initIpcHandlers,
    handleLoadAppById
};