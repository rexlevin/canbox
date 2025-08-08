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
    createWindow: (options) => {
        const win = new BrowserWindow(options);
        return win;
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