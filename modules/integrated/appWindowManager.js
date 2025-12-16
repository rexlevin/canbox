const { BrowserWindow } = require('electron');
const path = require('path');

class AppWindowManager {
    constructor() {
        this.windows = new Map();
    }

    createAppWindow(appConfig) {
        const { appId, width, height, title, preload, url } = appConfig;

        if (this.windows.has(appId)) {
            const existingWindow = this.windows.get(appId);
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
            this.windows.delete(appId);
        });

        this.windows.set(appId, win);
        return win;
    }

    closeAllWindows() {
        this.windows.forEach(window => {
            if (!window.isDestroyed()) {
                window.close();
            }
        });
        this.windows.clear();
    }
}

module.exports = AppWindowManager;