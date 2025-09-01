const { ipcMain, dialog, shell } = require('electron');
const appIpcHandler = require('./modules/main/ipc/appIpcHandler');
const repoIpcHandler = require('./modules/main/ipc/repoIpcHandler');
const shortcutIpcHandler = require('./modules/main/ipc/shortcutIpcHandler');

const appWindow = require('./modules/main/app.window');
const { getAppList } = require('./modules/main/appManager');

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
    // 初始化拆分后的 IPC 处理逻辑
    appIpcHandler.init(ipcMain);
    repoIpcHandler.init(ipcMain);
    shortcutIpcHandler.init(ipcMain);

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

}

module.exports = {
    initIpcHandlers,
    handleLoadAppById
};