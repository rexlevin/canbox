const { ipcMain, dialog, shell } = require('electron');

const appWindow = require('./modules/main/app.window')


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