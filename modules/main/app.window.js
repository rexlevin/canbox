const { BrowserWindow, WebContentsView, session } = require('@electron/remote'); // 使用 @electron/remote 是renderer 中能使用 main 进程中的对象，减少ipc
const path = require('path');
const ObjectUtils = require('../utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// 设置一个 map 集合，用于存放所有打开的 app window
let appMap = new Map();

module.exports = {
    /**
     *
     * @param {string} appItem app应用信息
     * @param {string} devTag app开发tag，dev：当前是开发app
     * @returns void
     */
    loadApp: (appItem, devTag) => {
        // console.info('loadApp===%o', appItem);
        appItem = JSON.parse(appItem);
        if(appMap.has(appItem.id)) {
            appMap.get(appItem.id).show();
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
                webSecurity: false
            }
        };
        if(undefined !== appItem.appJson.window) {
            options = ObjectUtils.clone(appItem.appJson.window);
            delete options.webPreferences;
            // options.webPreferences.sandbox = false;
            // options.webPreferences.spellcheck = false;
            // options.webPreferences.webSecurity = false;
        }
        let wp = {
            webPreferences: {
                sandbox: false,     // 没有这个配置，加载不到 preload.js
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: true,
                contextIsolation: false
            }
        }
        // 挂载 api 给 app
        // options.webPreferences.session = sess;
        wp.webPreferences.session = sess;
        if(undefined !== options.icon) {
            options.icon = path.join(appItem.path, options.icon);
        } else {
            options.icon = path.join(appItem.path, appItem.appJson.logo);
        }
        if(undefined !== appItem.appJson.window.webPreferences.preload) {
            // options.webPreferences.preload = path.join(appItem.path, appItem.appJson.window.webPreferences.preload);
            wp.webPreferences.preload = path.join(appItem.path, appItem.appJson.window.webPreferences.preload);
        }
        let appWin = new BrowserWindow(options);
        let appView = new WebContentsView(wp);
        appWin.contentView.addChildView(appView);

        if('dev' === devTag && undefined !== appItem.appJson.development && appItem.appJson.development.main) {
            appItem.appJson.main = appItem.appJson.development.main;
        }
        if(appItem.appJson.main.indexOf('http') !== -1) {
            // appWin.loadURL(appItem.appJson.main);
            appView.webContents.loadURL(appItem.appJson.main);
        } else {
            // appWin.loadFile(path.join(appItem.path, appItem.appJson.main));
            appView.webContents.loadURL(path.join(appItem.path, appItem.appJson.main));
        }
        appView.setBounds({
            x: 0, y: 0,
            width: options.width,
            height: options.height
        });
        appWin.setMenu(null);
        if(os === 'win') {
            appWin.setAppDetails({
                appId: appItem.id
            });
        }
        if('dev' === devTag && appItem.appJson.development && appItem.appJson.development.devTools) {
            appView.webContents.openDevTools({mode: appItem.appJson.development.devTools});
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
            appView.webContents.executeJavaScript(js);
        };

        appView.webContents.once('did-finish-load', ()=>{
            executeHook(appItem.id);
        });
        // appWin.on('ready-to-show', () => {
        //     executeHook(appItem.id);
        // });

        appWin.on('close', () => {
            console.info(`now will close app: ${appItem.id}`);
            appView.webContents.closeDevTools();
            // appView = undefined;
            // appWin = undefined;
            if(appWin.isDestroyed()) {
                console.info('appWin is destroyed');
            }
            appMap.delete(appItem.id);
        });

        appMap.set(appItem.id, appWin);
    }
}
