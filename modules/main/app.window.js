const { BrowserWindow, session } = require('@electron/remote'); // 使用 @electron/remote 是renderer 中能使用 main 进程中的对象，减少ipc
const path = require('path');
const fs = require('fs');
const ObjectUtils = require('../utils/ObjectUtils');

const os = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'darwin' : 'linux';

/**
 * 设置一个 map 集合，用于存放所有打开的 app window
 * 键是应用id，值是窗口对象
 */
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

        // 如果app已存在并且未被销毁，则显示app窗口
        if(appMap.has(appItem.id)) {
            const win = appMap.get(appItem.id);
            if (!win.isDestroyed()) {
                win.show();
                console.info('%s ( %s ) is already exists', appItem.id, appItem.appJson.name);
                return;
            }
        }

        // 使用id来创建唯一的session实例
        const sess = session.fromPartition(appItem.id);
        // 设置预加载脚本：设置preload文件，使app的渲染进程能调用到preload中的自定义window属性
        sess.setPreloads([path.join(__dirname, 'app.api.js')]);
        // 将appId存储到cookie
        const cookie = {name: 'appId', value: appItem.id, url: 'http://localhost:8080'};
        sess.cookies.set(cookie, err => {
            if(err) {
                console.error('Failed to set cookie:', err);
            }
        });

        // app窗口选项
        let options = {
            minWidth: 0,
            minHeight: 0,
            width: 800,
            height: 600,
            resizable: true,
            webPreferences: {}
        };

        // 合并自定义窗口选项：如果app.json中配置了窗口选项，则合并到options中
        if(appItem.appJson.window) {
            Object.assign(options, ObjectUtils.clone(appItem.appJson.window));
            // options = ObjectUtils.clone(appItem.appJson.window);
            
            if(options.icon) {
                options.icon = path.resolve(appItem.path, options.icon);
            } else {
                options.icon = path.resolve(appItem.path, appItem.appJson.logo);
            }

            options.webPreferences = {
                sandbox: true,
                spellcheck: false,
                webSecurity: false,
                nodeIntegration: false,  // 使app的渲染进程能不能使用nodejs集成
                contextIsolation: true, // 开启上下文隔离：使app的渲染进程能不能调用到preload中的自定义window方法或属性，只能通过contextBridge暴露api
                session: sess
            };
        }
        if(appItem.appJson.window?.webPreferences?.preload) {
            options.webPreferences.preload = path.resolve(appItem.path, appItem.appJson.window.webPreferences.preload);
        }
        console.info('options:', options);
        console.info('options:', JSON.stringify(options));

        // 合并开发选项：如果当前是开发app，则合并开发选项
        if('dev' === devTag && appItem.appJson.development?.main) {
            appItem.appJson.main = appItem.appJson.development.main;
        }

        // 创建窗口
        let appWin = new BrowserWindow(options);
        // appWin.webContents.session = sess;
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

        // 如果是开发模式且配置了开发者工具，则打开开发者工具
        if('dev' === devTag && appItem.appJson.development?.devTools) {
            appWin.webContents.openDevTools({mode: appItem.appJson.development.devTools});
        }

        // // 执行钩子函数，将appId注入到渲染进程中
        // const executeHook = (appId) => {
        //     console.info('====', appId);
        //     const js = `
        //         try {
        //             window.appId = '${appId}';
        //         } catch(e) {
        //             console.error('error', e);
        //         }
        //     `;
        //     appWin.webContents.executeJavaScript(js);
        // };
        // appWin.webContents.once('did-finish-load', ()=>{
        //     executeHook(appItem.id);
        // });

        // 监听窗口关闭事件：销毁窗口，并从appMap中删除
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

        // 将app窗口添加到appMap中
        appMap.set(appItem.id, appWin);
    }
}
