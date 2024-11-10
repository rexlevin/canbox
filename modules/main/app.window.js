const { BrowserWindow, session } = require('@electron/remote'); // 使用 @electron/remote 是renderer 中能使用 main 进程中的对象，减少ipc
const path = require('path');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

// 设置一个 map 集合，用于存放所有打开的 app window
let appMap = new Map();

module.exports = {
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
            options = cloneObj(appItem.appJson.window);
            options.webPreferences.sandbox = false;
            options.webPreferences.spellcheck = false;
            options.webPreferences.webSecurity = false;
        }
        // 挂载 api 给 app
        options.webPreferences.session = sess;
        if(undefined != options.icon) {
            options.icon = path.join(appItem.path, options.icon);
        } else {
            options.icon = path.join(appItem.path, appItem.appJson.logo);
        }
        if(undefined != options.webPreferences.preload) {
            options.webPreferences.preload = path.join(appItem.path, options.webPreferences.preload);
        }
        let appWin = new BrowserWindow(options);

        if('1' === devTag && undefined != appItem.appJson.development && appItem.appJson.development.main) {
            appItem.appJson.main = appItem.appJson.development.main;
        }
        if(appItem.appJson.main.indexOf('http') != -1) {
            appWin.loadURL(appItem.appJson.main);
        } else {
            appWin.loadFile(path.join(appItem.path, appItem.appJson.main));
        }
        appWin.setMenu(null);
        if(os === 'win') {
            appWin.setAppDetails({
                appId: appItem.id
            });
        }
        if('1' === devTag && undefined != appItem.appJson.development && appItem.appJson.development.devTools) {
            appWin.webContents.openDevTools({mode: appItem.appJson.development.devTools});
        }
        
        const executeHook = (appId) => {
            console.info('====', appId);
            const js = `
                window.canbox.on('AppLoad', 'asdfasdfasdfasdfasdf');
            `;
            appWin.webContents.executeJavaScript(js);
        };

        appWin.webContents.on('did-finish-load', () => {
            executeHook(appItem.id);
        });

        appMap.set(appItem.id, appWin);

        appWin.on('close', () => {
            console.info(`now will close app: ${appItem.id}`);
            appWin = undefined;
            appMap.delete(appItem.id);
        });
    }
}

function cloneObj(obj) {
    if(obj == null) return null;
    if (typeof obj !== 'object') {
        return obj;
    } else {
        var newobj = obj.constructor === Array ? [] : {};
        for (var i in obj) {
            newobj[i] = typeof obj[i] === 'object' ? cloneObj(obj[i]) : obj[i]; 
        }
        return newobj;
    }
}
