const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const logger = require('@modules/utils/logger');
const { getAppsStore, getAppsDevStore } = require('@modules/main/storageManager');
const { getAppPath } = require('@modules/main/pathManager');
const windowManager = require('@modules/main/windowManager');
const winState = require('@modules/main/winState');
const { handleError } = require('@modules/ipc/errorHandler');

/**
 * 应用窗口构建器
 * 负责创建和配置应用窗口
 */
class AppWindowBuilder {
    /**
     * 创建应用窗口
     * @param {string} uid - 应用唯一标识
     * @param {boolean} devTag - 是否为开发模式
     * @returns {Promise<BrowserWindow|null>}
     */
    static async createWindow(uid, devTag = false) {
        try {
            // 验证必要参数
            if (!uid) {
                handleError(new Error('uid is required'), 'createWindow');
                return null;
            }

            // 获取应用信息
            const appItem = this.getAppItem(uid, devTag);
            if (!appItem) {
                return null;
            }

            // 加载应用配置
            const { appPath, appJson, uatDevJson } = this.loadAppConfig(uid, appItem, devTag);
            
            // 创建会话
            const sess = this.createSession(uid);
            
            // 配置窗口选项
            const options = this.buildWindowOptions(uid, appPath, appJson, sess, devTag);
            
            // 恢复窗口状态并创建窗口
            return this.createWindowWithState(uid, options, appPath, appJson, uatDevJson, devTag);
            
        } catch (error) {
            handleError(error, 'createWindow');
            return null;
        }
    }

    /**
     * 获取应用信息
     * @param {string} uid 
     * @param {boolean} devTag 
     * @returns {Object|null}
     */
    static getAppItem(uid, devTag) {
        const appItem = devTag
            ? getAppsDevStore().get('default')[uid]
            : getAppsStore().get('default')[uid];
            
        if (!appItem) {
            handleError(new Error('appItem is not exists'), 'getAppItem');
            return null;
        }
        
        return appItem;
    }

    /**
     * 加载应用配置
     * @param {string} uid 
     * @param {Object} appItem 
     * @param {boolean} devTag 
     * @returns {Object}
     */
    static loadAppConfig(uid, appItem, devTag) {
        const appPath = devTag ? appItem.path : path.join(getAppPath(), uid + '.asar');
        const appJson = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf8'));

        // 加载开发配置
        const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
            ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
            : null;

        return { appPath, appJson, uatDevJson };
    }

    /**
     * 创建会话
     * @param {string} uid 
     * @returns {Session}
     */
    static createSession(uid) {
        const sess = session.fromPartition(uid);
        console.info('__dirname: ', __dirname);
        sess.registerPreloadScript({
            type: 'frame',
            filePath: path.join(__dirname, 'app.api.js')
        });
        return sess;
    }

    /**
     * 构建窗口选项
     * @param {string} uid 
     * @param {string} appPath 
     * @param {Object} appJson 
     * @param {Session} sess 
     * @param {boolean} devTag 
     * @returns {Object}
     */
    static buildWindowOptions(uid, appPath, appJson, sess, devTag) {
        // 默认窗口选项
        let options = {
            minWidth: 0,
            minHeight: 0,
            width: 800,
            height: 600,
            resizable: true,
            webPreferences: {},
            show: false
        };

        // 合并应用自定义窗口选项：如果app.json中配置了窗口选项，则合并到options中
        if (appJson.window) {
            Object.assign(options, this.cloneObject(appJson.window));
            this.setIconPath(options, appPath, appJson, devTag, uid);
            this.setWebPreferences(options, sess, uid);
        }

        // 处理 preload 路径
        if (appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appPath, appJson.window.webPreferences.preload);
        }

        // Linux 系统特殊处理
        if (os.platform() === 'linux') {
            options.windowClass = uid;
        }

        return options;
    }

    /**
     * 设置图标路径
     * @param {Object} options 
     * @param {string} appPath 
     * @param {Object} appJson 
     * @param {boolean} devTag 
     * @param {string} uid 
     */
    static setIconPath(options, appPath, appJson, devTag, uid) {
        if (options.icon) {
            options.icon = path.resolve(appPath, options.icon);
        } else {
            options.icon = path.resolve(appPath, appJson.logo);
        }
        
        if (!devTag) {
            const logoExt = path.extname(appJson.logo);
            options.icon = path.resolve(getAppPath(), `${uid}${logoExt}`);
            console.info('当前是正式模式， 使用 app 目录下的logo: ', options.icon);
        }
    }

    /**
     * 设置 Web 偏好选项
     * @param {Object} options 
     * @param {Session} sess 
     * @param {string} uid 
     */
    static setWebPreferences(options, sess, uid) {
        options.webPreferences = {
            sandbox: false,
            noSandbox: true,
            spellcheck: false,
            webSecurity: false,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
            contextIsolation: true,
            session: sess,
            additionalArguments: [`--app-id=${uid}`],
        };
    }

    /**
     * 根据窗口状态创建窗口
     * @param {string} uid 
     * @param {Object} options 
     * @param {string} appPath 
     * @param {Object} appJson 
     * @param {Object} uatDevJson 
     * @param {boolean} devTag 
     */
    static createWindowWithState(uid, options, appPath, appJson, uatDevJson, devTag) {
        const state = winState.loadSync(uid);
        // 恢复窗口位置和大小
        if (!state || state.restore !== 0) {
            if (state?.position) {
                options.x = state.position.x;
                options.y = state.position.y;
                options.width = state.position.width;
                options.height = state.position.height;
            }
        }
        
        console.info('load app window options===%o', options);
        
        // 创建窗口
        const appWin = new BrowserWindow(options);
        
        // 最大化处理
        if (state?.isMax) {
            appWin.maximize();
        }
        
        // 加载应用
        this.loadAppContent(appWin, appPath, appJson, uatDevJson, devTag);
        
        // 设置窗口事件
        this.setupWindowEvents(appWin, uid, devTag, uatDevJson);
        
        // 注册窗口
        windowManager.addWindow(uid, appWin);
        console.info('appMap length: %o', windowManager.appMap.size);

        return appWin;
    }

    /**
     * 加载应用内容
     * @param {BrowserWindow} appWin 
     * @param {string} appPath 
     * @param {Object} appJson 
     * @param {Object} uatDevJson 
     * @param {boolean} devTag 
     */
    static loadAppContent(appWin, appPath, appJson, uatDevJson, devTag) {
        const appMain = devTag && uatDevJson?.main ? uatDevJson.main : appJson.main;
        const loadUrl = appMain.startsWith('http')
            ? appMain
            : `file://${path.resolve(appPath, appMain)}`;
            
        console.info(`load app window url===%o`, loadUrl);
        
        appWin.loadURL(loadUrl).catch(err => {
            console.error('Failed to load URL:', err);
        });
    }

    /**
     * 设置窗口事件
     * @param {BrowserWindow} appWin 
     * @param {string} uid 
     * @param {boolean} devTag 
     * @param {Object} uatDevJson 
     */
    static setupWindowEvents(appWin, uid, devTag, uatDevJson) {
        // 关闭事件
        appWin.on('close', () => this.handleWindowClose(appWin, uid));
        
        // 准备显示事件
        appWin.on('ready-to-show', () => {
            // appWin.show();
            if (devTag && uatDevJson?.devTools) {
                appWin.webContents.openDevTools({ mode: uatDevJson?.devTools });
            }
        });
        
        // 设置菜单和应用详情
        appWin.setMenu(null);
        if (process.platform === 'win') {
            appWin.setAppDetails({ appId: uid });
        }
    }

    /**
     * 处理窗口关闭事件
     * @param {BrowserWindow} appWin 
     * @param {string} uid 
     */
    static handleWindowClose(appWin, uid) {
        // 通知渲染进程
        if (appWin.webContents) {
            appWin.webContents.send('window-close-callback');
        }
        
        // 保存窗口状态
        const bounds = appWin.getContentBounds();
        const isMax = appWin.isMaximized();
        winState.save(uid, {
            restore: 1,
            isMax,
            position: isMax ? null : bounds
        }, () => {});
        
        console.info(`now will close app: ${uid}`);
        
        // 关闭子窗口
        this.closeChildWindows(uid);
        
        // 关闭主窗口
        this.closeMainWindow(appWin, uid);
    }

    /**
     * 关闭子窗口
     * @param {string} uid 
     */
    static closeChildWindows(uid) {
        const childWindows = windowManager.getChildWindows(uid);
        childWindows.forEach(childId => {
            if (windowManager.hasWindow(childId)) {
                const childWin = windowManager.getWindow(childId);
                if (!childWin.isDestroyed()) {
                    try {
                        childWin.webContents.closeDevTools();
                        childWin.removeAllListeners('close');
                        childWin.close();
                        windowManager.removeWindow(childId);
                    } catch (e) {
                        console.error(`Failed to close child window ${childId}:`, e);
                    }
                }
            }
        });
        windowManager.removeRelation(uid);
    }

    /**
     * 关闭主窗口
     * @param {BrowserWindow} appWin 
     * @param {string} uid 
     */
    static closeMainWindow(appWin, uid) {
        if (!appWin.isDestroyed()) {
            try {
                appWin.webContents.closeDevTools();
                appWin.removeAllListeners('close');
                appWin.close();
            } catch (e) {
                console.error(`Failed to close window ${uid}:`, e);
            }
        }
        windowManager.removeWindow(uid);
        console.info('All related windows closed');
    }

    /**
     * 深拷贝对象
     * @param {Object} obj 
     * @returns {Object}
     */
    static cloneObject(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

module.exports = AppWindowBuilder;