const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const ObjectUtils = require('../utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// 导入窗口管理模块
const windowManager = require('./windowManager');

const { getAppPath } = require('./pathManager');

module.exports = {
    /**
     *
     * @param {String} appItemStr app应用信息
     * @param {String} devTag app开发tag，dev：当前是开发app
     * @returns void
     */
    loadApp: (appItemStr, devTag) => {
        console.info('loadApp===%o', appItemStr);
        let appItem;
        try {
            appItem = JSON.parse(appItemStr);
        } catch (e) {
            console.error('Failed to parse app item:', e);
            return;
        }

        // 如果app已存在并且未被销毁，则显示app窗口
        if (windowManager.hasWindow(appItem.id)) {
            const win = windowManager.getWindow(appItem.id);
            if (!win.isDestroyed()) {
                win.show();
                console.info('%s ( %s ) is already exists', appItem.id, appItem.appJson.name);
                return;
            }
        }

        // 使用id来创建唯一的session实例
        const sess = session.fromPartition(appItem.id);
        // 设置预加载脚本：设置preload文件，使app的渲染进程能调用到preload中的自定义window属性
        // sess.setPreloads([path.join(__dirname, 'app.api.js')]);
        sess.registerPreloadScript({
            type: 'frame',
            filePath: path.join(__dirname, 'app.api.js')
        });

        // app窗口选项
        let options = {
            minWidth: 0,
            minHeight: 0,
            width: 800,
            height: 600,
            resizable: true,
            webPreferences: {},
            show: false
        };

        // 合并自定义窗口选项：如果app.json中配置了窗口选项，则合并到options中
        if (appItem.appJson.window) {
            Object.assign(options, ObjectUtils.clone(appItem.appJson.window));
            // options = ObjectUtils.clone(appItem.appJson.window);

            if (options.icon) {
                options.icon = path.resolve(appItem.path, options.icon);
            } else {
                options.icon = path.resolve(appItem.path, appItem.appJson.logo);
            }
            if (!devTag) {
                const logoExt = path.extname(appItem.appJson.logo);
                options.icon = path.resolve(getAppPath(), `${appItem.id}${logoExt}`);
                console.info('当前是正式模式， 使用 app 目录下的logo: ', options.icon);
            }

            options.webPreferences = {
                sandbox: false,
                noSandbox: true,    // 启用 --no-sandbox
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: false,  // 使app的渲染进程能使用nodejs集成
                nodeIntegrationInSubFrames: true,
                contextIsolation: true, // 开启上下文隔离：使app的渲染进程能不能调用到preload中的自定义window方法或属性，只能通过contextBridge暴露api
                // allowRunningInsecureContent: false,
                // allowEval: false,
                session: sess,
                additionalArguments: [`--app-id=${appItem.id}`],
            };
        }
        if (appItem.appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appItem.path, appItem.appJson.window.webPreferences.preload);
        }
        if (os === 'linux') {
            // 与shortcutManager中生成快捷方式中的name保持一致
            options.windowClass = `canbox-${appItem.appJson.name}`;
        }
        // console.info('load app options:', options);

        // 开发选线 uat.dev.json
        // console.info('uat.dev.json is exists: ', fs.existsSync(path.resolve(appItem.path, 'uat.dev.json')));
        const uatDevJson = fs.existsSync(path.resolve(appItem.path, 'uat.dev.json'))
            ? JSON.parse(fs.readFileSync(path.resolve(appItem.path, 'uat.dev.json'), 'utf-8'))
            : null;
        console.info('uatDevJson: ', uatDevJson);

        // 合并开发选项：如果当前是开发app，则合并开发选项
        if ('dev' === devTag && uatDevJson?.main) {
            appItem.appJson.main = uatDevJson.main;
        }

        // 加载窗口状态
        const winState = require('./winState');
        let appWin; // 提升到外层作用域
        winState.load(appItem.id, (res) => {
            const state = res.data;
            // 默认恢复窗口状态（restore 为 1）
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
            appWin = new BrowserWindow(options);
            if (state?.isMax) {
                appWin.maximize();
            }
            const loadUrl = appItem.appJson.main.startsWith('http')
                ? appItem.appJson.main
                : `file://${path.resolve(appItem.path, appItem.appJson.main)}`;
            console.info(`load app window url===%o`, loadUrl);
            appWin.loadURL(loadUrl).catch(err => {
                console.error('Failed to load URL:', err);
            });

            // 保存窗口状态
            appWin.on('close', () => {
                const bounds = appWin.getContentBounds();
                const isMax = appWin.isMaximized();
                winState.save(appItem.id, {
                    restore: 1,
                    isMax,
                    position: isMax ? null : bounds
                }, () => { });
                console.info(`now will close app: ${appItem.id}`);

                // 关闭所有关联的子窗口
                const childWindows = windowManager.getChildWindows(appItem.id);
                childWindows.forEach(childId => {
                    if (windowManager.hasWindow(childId)) {
                        const childWin = windowManager.getWindow(childId);
                        if (!childWin.isDestroyed()) {
                            try {
                                childWin.webContents.closeDevTools();
                                // 移除子窗口的关闭事件监听器，避免触发主窗口关闭
                                childWin.removeAllListeners('close');
                                childWin.close();
                                windowManager.removeWindow(childId);
                            } catch (e) {
                                console.error(`Failed to close child window ${childId}:`, e);
                            }
                        }
                    }
                });
                windowManager.removeRelation(appItem.id);

                // 关闭当前窗口
                if (!appWin.isDestroyed()) {
                    try {
                        appWin.webContents.closeDevTools();
                        // 移除主窗口的关闭事件监听器，避免递归调用
                        appWin.removeAllListeners('close');
                        appWin.close();
                    } catch (e) {
                        console.error(`Failed to close window ${appItem.id}:`, e);
                    }
                }
                windowManager.removeWindow(appItem.id);
                console.info('All related windows closed');
            });

            appWin.setMenu(null);
            if (os === 'win') {
                appWin.setAppDetails({
                    appId: appItem.id
                });
            }

            appWin.on('ready-to-show', () => {
                appWin.show();
                // 如果是开发模式且配置了开发者工具，则打开开发者工具
                if ('dev' === devTag && uatDevJson?.devTools) {
                    appWin.webContents.openDevTools({ mode: uatDevJson?.devTools });
                }
            });

            // 将app窗口添加到appMap中
            windowManager.addWindow(appItem.id, appWin);
            console.info('appMap length: %o', windowManager.appMap.size);
        });
    }

}
