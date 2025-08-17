const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// 初始化 storage 实例
const { getAppsDevStore } = require('./storageManager');
const AppsDevConfig = getAppsDevStore();

/**
 * 窗口操作模块
 */
const WindowManager = {
    /**
     * 新开窗口
     * @param {Object} options - 窗口配置
     * @param {Object} params - 窗口请求参数
     * @param {string} parentWindowId - 父窗口id
     * @returns {Number} 新窗口实例
     */
    createWindow: (options, params, parentWindowId = null) => {
        if (!params.url) {
            throw new Error('loadURL is required');
        }
        let loadURL = params.url;
        const devTools = params.devTools ? true : false;
        if (!parentWindowId) {
            throw new Error('parentWindowId is required');
        }

        if (!options || typeof options !== 'object') {
            console.error('Invalid options parameter: must be an object');
            options = { width: 800, height: 600 };
        }

        if (!options.width || !options.height) {
            console.warn('Missing required window dimensions, using defaults');
            options = { ...options, width: options.width || 800, height: options.height || 600, show: false };
        }

        try {
            // 根据 parentWindowId 判断应用类型并拼接完整路径
            const appDevConfigArr = AppsDevConfig.get('default') || [];
            if (appDevConfigArr.find(item => item.id === parentWindowId)) {
                const appDevPath = appDevConfigArr.find(item => item.id === parentWindowId).path;
                const appJsonPath = path.join(appDevPath, 'app.json');
                const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
                const uatDevJson = fs.existsSync(path.resolve(appDevPath, 'uat.dev.json'))
                            ? JSON.parse(fs.readFileSync(path.resolve(appDevPath, 'uat.dev.json'), 'utf-8'))
                            : null;
                /*
                 * uat.dev.json中的main存在，那么以uat.dev.json中的main为基准；
                 * uat.dev.json中不存在，以app.json中main基准；两者都不存在，以path为基准（相对路径）
                 * uat.dev.json中的main也可能是一个相对路径，所以需要判断是否是http开头，否则需要拼接项目路径
                 */
                const mainPath = uatDevJson
                    ? uatDevJson.main.startsWith('http')
                        ? uatDevJson.main
                        : path.join(appDevPath, uatDevJson.main)
                    : path.join(appDevPath, appJson.main);
                console.info('mainPath: ', mainPath);
                loadURL = path.join(mainPath, loadURL);
            } else {
                const { getAppsPath } = require('./pathManager');
                loadURL = path.join(getAppsPath(), `${parentWindowId}.asar`, loadURL);
            }
            console.info('win.js, loadURL: ', loadURL);

            const win = new BrowserWindow(options);
            win.loadURL(loadURL);
            win.setMenu(null);
            
            win.on('ready-to-show', () => {
                win.setTitle(params.title);
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
            });

            return win.id;
        } catch (err) {
            console.error('Failed to create window:', err);
            throw err;
        }
    }
};

module.exports = WindowManager;