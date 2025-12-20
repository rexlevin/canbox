const { BrowserWindow } = require('electron');
const path = require('path');

class AppWindowManager {
    constructor() {
        this.winMap = new Map();
    }

    /**
     * 启动 App
     * @param {string} uid - App ID
     * @param {BrowserWindow} appWin - 应用窗口
     * @returns 
     */
    startApp(uid, appWin) {
        appWin.show();
        // if (this.winMap.has(uid)) {
        //     const existingWindow = this.winMap.get(uid);
        //     if (existingWindow.isMinimized()) {
        //         existingWindow.restore();
        //     }
        //     existingWindow.focus();
        //     return existingWindow;
        // }

        // appWin.on('closed', () => {
        //     this.winMap.delete(uid);
        // });

        // this.winMap.set(uid, appWin);
        // return win;
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
        return win && !win.isDestroyed();
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
        const win = this.winMap.get(uid);
        if (win.isDestroyed()) {
            this.winMap.delete(uid);
            return;
        }
        win.show();
        win.focus();
    }
}

// 创建单例实例
const appWindowManager = new AppWindowManager();

module.exports = appWindowManager;