const { BrowserWindow } = require('electron');

/**
 * 窗口操作模块
 */
const WindowManager = {
    /**
     * 新开窗口
     * @param {Object} options - 窗口配置
     * @param {String} loadURL - 窗口打开的url
     * @param {Boolean} devTools - 是否开启调试模式
     * @param {Number} parentWindowId - 父窗口实例id
     * @returns {BrowserWindow} 新窗口实例
     */
    createWindow: (options, loadURL, devTools = false, parentWindowId = null) => {
    // createWindow: (options, parentWindowId = null) => {
        if (!options || typeof options !== 'object') {
            console.error('Invalid options parameter: must be an object');
            options = { width: 800, height: 600 };
        }

        if (!options.width || !options.height) {
            console.warn('Missing required window dimensions, using defaults');
            options = { ...options, width: options.width || 800, height: options.height || 600, show: false };
        }

        try {
            const win = new BrowserWindow(options);
            if (loadURL) {
                win.loadURL(loadURL);
            }
            win.on('ready-to-show', () => {
                win.show();
                if (devTools) {
                    win.webContents.openDevTools();
                }
            });


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

            return win.id;
        } catch (error) {
            console.error('Failed to create window:', error);
            return null;
        }
    }
};

module.exports = WindowManager;