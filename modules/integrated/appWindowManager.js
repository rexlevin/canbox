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
     * @returns {boolean} - 是否成功
     */
    startApp(uid, appWin) {
        try {
            // 验证必要参数
            if (!uid) {
                handleError(new Error('uid is required'), 'createWindow');
                return null;
            }

            // 获取应用信息
            const appItem = devTag
                ? getAppsDevStore().get('default')[uid]
                : getAppsStore().get('default')[uid];
                
            if (!appItem) {
                handleError(new Error('appItem is not exists'), 'createWindow');
                return null;
            }

            // 加载应用配置
            const appPath = devTag ? appItem.path : path.join(getAppPath(), uid + '.asar');
            const appJson = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf8'));

            // 加载开发配置
            const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
                ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
                : null;
            
            // 创建会话
            const sess = session.fromPartition(uid);
            console.info('__dirname: ', __dirname);
            sess.registerPreloadScript({
                type: 'frame',
                filePath: path.join(__dirname, '../app.api.js')
            });
            
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
                Object.assign(options, JSON.parse(JSON.stringify(appJson.window)));
                
                // 设置图标路径
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
                
                // 设置 Web 偏好选项
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

            // 处理 preload 路径
            if (appJson.window?.webPreferences?.preload) {
                options.webPreferences.preload = path.resolve(appPath, appJson.window.webPreferences.preload);
            }

            // Linux 系统特殊处理
            if (os.platform() === 'linux') {
                options.windowClass = uid;
            }
            
            // 恢复窗口状态并创建窗口
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
            
            // 加载应用内容
            const appMain = devTag && uatDevJson?.main ? uatDevJson.main : appJson.main;
            const loadUrl = appMain.startsWith('http')
                ? appMain
                : `file://${path.resolve(appPath, appMain)}`;
                
            console.info(`load app window url===%o`, loadUrl);
            
            appWin.loadURL(loadUrl).catch(err => {
                console.error('Failed to load URL:', err);
            });
            
            // 设置窗口事件
            appWin.on('close', () => {
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
                
                // 关闭主窗口
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
            });
            
            // 准备显示事件
            appWin.on('ready-to-show', () => {
                appWin.show();
                if (devTag && uatDevJson?.devTools) {
                    appWin.webContents.openDevTools({ mode: uatDevJson?.devTools });
                }
            });
            
            // 设置菜单和应用详情
            appWin.setMenu(null);
            if (process.platform === 'win') {
                appWin.setAppDetails({ appId: uid });
            }
            
            // 注册窗口
            windowManager.addWindow(uid, appWin);
            console.info('appMap length: %o', windowManager.appMap.size);

            return appWin;
            
        } catch (error) {
            handleError(error, 'createWindow');
            return null;
        }
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