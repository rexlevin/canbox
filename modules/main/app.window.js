const { BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const ObjectUtils = require('../utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// 导入窗口管理模块
const windowManager = require('./windowManager');
const { getAppsStore, getAppsDevStore } = require('./storageManager');
const { getAppPath } = require('./pathManager');
const appProcessManager = require('./appProcessManager');
const { shouldUseSeparateProcess } = require('./appConfig');

const { handleError } = require('./ipc/errorHandler')

module.exports = {
    /**
     *
     * @param {String} appItemStr app应用uid
     * @param {boolean} devTag app开发tag，true：当前是开发app
     * @param {boolean} useSeparateProcess 是否使用独立进程模式（可选，默认从配置读取）
     * @returns void
     */
    loadApp: async (uid, devTag, useSeparateProcess = null) => {
        // 如果没有指定 useSeparateProcess，从配置读取
        if (useSeparateProcess === null) {
            useSeparateProcess = shouldUseSeparateProcess(devTag);
        }

        console.info('loadApp uid: ', uid, 'useSeparateProcess:', useSeparateProcess);
        if (!uid) {
            return handleError(new Error('uid is required'), 'loadApp');
        }

        const appItem = devTag
                ? getAppsDevStore().get('default')[uid]
                : getAppsStore().get('default')[uid];
        if (!appItem) {
            return handleError(new Error('appItem is not exists'), 'loadApp');
        }

        // 如果使用独立进程模式
        if (useSeparateProcess) {
            // 检查App进程是否已运行
            if (appProcessManager.isAppRunning(uid)) {
                console.info(`App ${uid} is already running in separate process`);
                return;
            }

            // 启动App进程
            const result = await appProcessManager.startAppProcess(uid, devTag);
            if (result.success) {
                console.info(`App ${uid} started in separate process`);
                return; // 成功启动独立进程，直接返回
            } else {
                console.error(`Failed to start app ${uid}:`, result.msg);
                // 回退到传统模式
                console.info('Falling back to traditional window mode');
            }
        }

        const appJson = devTag
                ? JSON.parse(fs.readFileSync(path.join(appItem.path, 'app.json'), 'utf8'))
                : JSON.parse(fs.readFileSync(path.join(getAppPath(), uid + '.asar/app.json'), 'utf8'));
        const appPath = devTag ? appItem.path : path.join(getAppPath(), uid + '.asar');

        // 如果app已存在并且未被销毁，则显示app窗口
        if (windowManager.hasWindow(uid)) {
            const win = windowManager.getWindow(uid);
            if (!win.isDestroyed()) {
                win.show();
                console.info('%s ( %s ) is already exists', uid, uid);
                return;
            }
        }

        // 使用id来创建唯一的session实例
        const sess = session.fromPartition(uid);
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
        if (appJson.window) {
            Object.assign(options, ObjectUtils.clone(appJson.window));
            // options = ObjectUtils.clone(appItem.appJson.window);

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
                additionalArguments: [`--app-id=${uid}`],
            };
        }
        if (appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appPath, appJson.window.webPreferences.preload);
        }
        if (os === 'linux') {
            // 使用应用的UID作为唯一的windowClass，与快捷方式中的StartupWMClass保持一致
            options.windowClass = uid;
        }
        // console.info('load app options:', options);

        // 开发选线 uat.dev.json
        // console.info('uat.dev.json is exists: ', fs.existsSync(path.resolve(appItem.path, 'uat.dev.json')));
        const uatDevJson = fs.existsSync(path.resolve(appPath, 'uat.dev.json'))
            ? JSON.parse(fs.readFileSync(path.resolve(appPath, 'uat.dev.json'), 'utf-8'))
            : null;
        console.info('uatDevJson: ', uatDevJson);

        // 加载窗口状态
        const winState = require('./winState');
        let appWin; // 提升到外层作用域
        winState.load(uid, (res) => {
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
            const appMain = devTag && uatDevJson?.main ? uatDevJson.main : appJson.main;
            const loadUrl = appMain.startsWith('http')
                    ? appMain
                    : `file://${path.resolve(appPath, appMain)}`;
            console.info(`load app window url===%o`, loadUrl);
            appWin.loadURL(loadUrl).catch(err => {
                console.error('Failed to load URL:', err);
            });

            // 保存窗口状态
            appWin.on('close', () => {
                // 通过 IPC 通信通知渲染进程执行回调
                if (appWin.webContents) {
                    appWin.webContents.send('window-close-callback');
                }
                const bounds = appWin.getContentBounds();
                const isMax = appWin.isMaximized();
                winState.save(uid, {
                    restore: 1,
                    isMax,
                    position: isMax ? null : bounds
                }, () => { });
                console.info(`now will close app: ${uid}`);

                // 关闭所有关联的子窗口
                const childWindows = windowManager.getChildWindows(uid);
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
                windowManager.removeRelation(uid);

                // 关闭当前窗口
                if (!appWin.isDestroyed()) {
                    try {
                        appWin.webContents.closeDevTools();
                        // 移除主窗口的关闭事件监听器，避免递归调用
                        appWin.removeAllListeners('close');
                        appWin.close();
                    } catch (e) {
                        console.error(`Failed to close window ${uid}:`, e);
                    }
                }
                windowManager.removeWindow(uid);
                console.info('All related windows closed');
            });

            appWin.setMenu(null);
            if (os === 'win') {
                appWin.setAppDetails({
                    appId: uid
                });
            }

            appWin.on('ready-to-show', () => {
                appWin.show();
                // 如果是开发模式且配置了开发者工具，则打开开发者工具
                if (devTag && uatDevJson?.devTools) {
                    appWin.webContents.openDevTools({ mode: uatDevJson?.devTools });
                }
            });

            // 将app窗口添加到appMap中
            windowManager.addWindow(uid, appWin);
            console.info('appMap length: %o', windowManager.appMap.size);
        });
    }

}
