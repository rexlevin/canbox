const { app, ipcMain } = require('electron');
const shortcutManager = require('../shortcutManager');
const { getAppsData } = require('../appManager');

/**
 * 初始化快捷方式相关的 IPC 处理逻辑
 */
function initShortcutHandlers() {
    // 生成快捷方式
    ipcMain.handle('generate-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下生成快捷方式' };
        }
        const apps = await getAppsData();
        return shortcutManager.generateShortcuts(apps);
    });

    // 删除快捷方式
    ipcMain.handle('delete-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下删除快捷方式' };
        }
        const apps = await getAppsData();
        return shortcutManager.deleteShortcuts(apps);
    });
}

module.exports = {
    init: initShortcutHandlers
};