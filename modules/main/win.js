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
    createWindow: (options, loadURL, devTools = false, devToolsMode = 'right') => {
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