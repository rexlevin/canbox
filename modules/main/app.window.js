const { BrowserWindow, WebContentsView, session } = require('@electron/remote'); // 使用 @electron/remote 是renderer 中能使用 main 进程中的对象，减少ipc
const path = require('path');
const ObjectUtils = require('../utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// 设置一个 map 集合，用于存放所有打开的 app window
let appMap = new Map();

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
        } catch(e) {
            console.error('Failed to parse app item:', e);
            return;
        }

        if(appMap.has(appItem.id)) {
            const win = appMap.get(appItem.id);
            if (!win.isDestroyed()) {
                win.show();
            }
            console.info(appItem.id + ' ' + appItem.appJson.name + ' is already exists');
            return;
        }

        const sess = session.fromPartition(appItem.id);
        sess.setPreloads([path.join(__dirname, 'app.api.js')]);

        let options = {
            minWidth: 0,
            minHeight: 0,
            width: 800,
            height: 600,
            resizable: true,
            webPreferences: {
                sandbox: false,     // 没有这个配置，加载不到 preload.js
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: true,  // 使app的渲染进程能调用到preload中的自定义window属性
                contextIsolation: false,
                session: sess
            }
        };

        if(appItem.appJson.window) {
            Object.assign(options, ObjectUtils.clone(appItem.appJson.window));
            // options = ObjectUtils.clone(appItem.appJson.window);
            
            if(options.icon) {
                options.icon = path.resolve(appItem.path, options.icon);
            } else {
                options.icon = path.resolve(appItem.path, appItem.appJson.logo);
            }

            options.webPreferences = {
                sandbox: false,     // 没有这个配置，加载不到 preload.js
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: true,  // 使app的渲染进程能调用到preload中的自定义window属性
                contextIsolation: false,
                session: sess
            };
        }
        if(appItem.appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appItem.path, appItem.appJson.window.webPreferences.preload);
        }
        console.info('options:', options);
        console.info('options:', JSON.stringify(options));

        let appWin = new BrowserWindow(options);
        // appWin.webContents.session = sess;

        if('dev' === devTag && appItem.appJson.development?.main) {
            appItem.appJson.main = appItem.appJson.development.main;
        }

        const loadUrl = appItem.appJson.main.indexOf('http') !== -1 
                ? appItem.appJson.main 
                : `file://${path.resolve(appItem.path, appItem.appJson.main)}`;
        appWin.loadURL(loadUrl).catch(err => {
            console.error('Failed to load URL:', err);
        });

        appWin.setMenu(null);
        if(os === 'win') {
            appWin.setAppDetails({
                appId: appItem.id
            });
        }

        if('dev' === devTag && appItem.appJson.development?.devTools) {
            appWin.webContents.openDevTools({mode: appItem.appJson.development.devTools});
        }

        const executeHook = (appId) => {
            console.info('====', appId);
            const js = `
                try {
                    window.appId = '${appId}';
                } catch(e) {
                    console.error('error', e);
                }
            `;
            appWin.webContents.executeJavaScript(js);
        };

        appWin.webContents.once('did-finish-load', ()=>{
            executeHook(appItem.id);
        });

        appWin.on('close', () => {
            console.info(`now will close app: ${appItem.id}`);
            if(!appWin.isDestroyed()) {
                try {
                    appWin.webContents.closeDevTools();
                } catch(e) {
                    // console.error('Failed to close devtools:', e);
                }
            }
            console.info('appWin is destroyed');
            appMap.delete(appItem.id);
        });

        appMap.set(appItem.id, appWin);
    }
}
