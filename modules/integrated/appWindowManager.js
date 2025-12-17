const { BrowserWindow } = require('electron');
const path = require('path');

class AppWindowManager {
    constructor() {
        this.winMap = new Map();
    }

    startApp(appConfig) {
        const { appId, width, height, title, preload, url } = appConfig;

        if (this.winMap.has(appId)) {
            const existingWindow = this.winMap.get(appId);
            if (existingWindow.isMinimized()) {
                existingWindow.restore();
            }
            existingWindow.focus();
            return existingWindow;
        }

        const win = new BrowserWindow({
            width: width || 1200,
            height: height || 800,
            title: title || 'Application',
            webPreferences: {
                preload: preload || path.join(__dirname, '../preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        win.loadURL(url || `file://${path.join(__dirname, '../index.html')}`);

        win.on('closed', () => {
            this.winMap.delete(appId);
        });

        this.winMap.set(appId, win);
        return win;
    }

    closeAllWindows() {
        this.winMap.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        this.winMap.clear();
    }

    /**
     * 检查App是否正在运行
     * @param {string} uid - App ID
     * @returns {boolean}
     */
    isAppRunning(uid) {
        const win = this.winMap.get(uid);
        return win && !process.isDestroyed;
    }

    /**
     * 聚焦App窗口
     * @param {string} uid 
     * @returns {boolean}
     */
    focusApp(uid) {
        if (!this.winMap.has(uid)) {
            return;
        }
        const win = windowManager.getWindow(uid);
        if (win.isDestroyed) {
            this.winMap.delete(uid);
            return;
        }
        win.show();
    }
}

module.exports = AppWindowManager;