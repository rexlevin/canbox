const { BrowserWindow, dialog, Notification } = require('electron');

/**
 * 窗口操作模块
 */
const WindowManager = {
    /**
     * 新开窗口
     * @param {Object} options - 窗口配置
     * @returns {BrowserWindow} 新窗口实例
     */
    // createWindow: (options, loadURL, devTools = false, devToolsMode = 'right', parentWindowId = null) => {
    createWindow: (options, parentWindowId = null) => {
        if (!options || typeof options !== 'object') {
            console.error('Invalid options parameter: must be an object');
            options = { width: 800, height: 600 };
        }

        if (!options.width || !options.height) {
            console.warn('Missing required window dimensions, using defaults');
            options = { ...options, width: options.width || 800, height: options.height || 600 };
        }

        try {
            const win = new BrowserWindow(options);
            // if (loadURL) {
            //     win.loadURL(loadURL);
            // }
            // if (devTools) {
            //     win.webContents.openDevTools({ mode: devToolsMode });
            // }

            // 记录窗口父子关系
            if (parentWindowId) {
                const windowManager = require('./windowManager');
                windowManager.addWindow(win.id, win);
                windowManager.addRelation(parentWindowId, win.id);
                // 存储父窗口ID到子窗口实例
                win.parentId = parentWindowId;
            }

            win.on('close', () => {
                const windowManager = require('./windowManager');
                windowManager.removeWindow(win.id);
                // 使用父窗口ID删除当前子窗口的父子关系
                if (win.parentId) {
                    windowManager.removeChildRelation(win.parentId, win.id);
                }
                win.destroy();
            });

            return win;
        } catch (error) {
            console.error('Failed to create window:', error);
            return null;
        }
    },

    /**
     * 打开对话框
     * @param {Object} options - 对话框配置
     * @returns {Promise} 对话框结果
     */
    showDialog: (options) => {
        return dialog.showOpenDialog(options);
    },

    /**
     * 发出通知
     * @param {Object} options - 通知配置
     */
    showNotification: (options) => {
        const notification = new Notification(options);
        notification.show();
    }
};

module.exports = WindowManager;