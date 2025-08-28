const { ipcMain } = require('electron');
const { getAppList } = require('../storageManager');
const shortcutManager = require('../shortcutManager');

/**
 * 初始化快捷方式相关的 IPC 处理逻辑
 */
function initShortcutHandlers() {
    // 生成快捷方式
    ipcMain.handle('generate-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下生成快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.generateShortcuts(appList);
    });

    // 删除快捷方式
    ipcMain.handle('delete-shortcut', async () => {
        if (!app.isPackaged) {
            return { success: false, msg: '只能在生产环境下删除快捷方式' };
        }
        const appList = await getAppList();
        return shortcutManager.deleteShortcuts(appList);
    });
}

module.exports = {
    init: initShortcutHandlers
};