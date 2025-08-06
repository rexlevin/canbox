const { contextBridge, ipcRenderer } = require('electron');
const Store  = require('electron-store');
const path = require('path')
const fs = require("fs");
const uuid = require('uuid');
const PackageJson = require('./package.json');

const AppShortcut = require('./modules/main/app.shortcut');
const AppRepo = require('./modules/main/app.repo');

/*
 * userData目录：
 * windows：~\AppData\Roaming\canbox\
 * linux: ~/config/canbox/
 */
const USER_DATA_PATH = ipcRenderer.sendSync('getPath', 'userData');

const DATA_PATH = path.join(USER_DATA_PATH, 'Users', 'data');
const APP_PATH = path.join(USER_DATA_PATH, 'Users', 'apps');

const AppsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

const AppsDevConfig = new Store({
    cwd: 'Users',
    name: 'appsDev'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = PackageJson.description + ' - v' + PackageJson.version;
});

ipcRenderer.on('loadAppDirect', (e, appId) => {
    console.info('loadAppDirect: %s',appId);
    for(let appItem of getAppList()) {
        if(appItem.id === appId) {
            ipcRenderer.send('loadApp', JSON.stringify(appItem));
        }
    }
});

contextBridge.exposeInMainWorld(
    "api", {
        reload: () => {
            ipcRenderer.send('reload');
        },
        openDevTools: () => {
            ipcRenderer.send('openDevTools');
        },
        getRepoInfo: () => {
            console.info('AppRepo.info==', AppRepo.info());
            return AppRepo.info();
        },
        generateShortcut: () => {
            // console.info('222222222222222process.execPath==', process.execPath);
            // ipcRenderer.send('generateStartupShortcut', JSON.stringify(getAppList()));
            AppShortcut.generateStartupShortcut(JSON.stringify(getAppList()));
        },
        deleteShortcut: () => {
            AppShortcut.deleteStartupShortcut();
        },
        openUrl: (url) => {
            console.info('url====', url);
            ipcRenderer.send('open-url', url);
        },
        showDialog: (options) => {
            return ipcRenderer.invoke('show-dialog', options);
        },
        selectDirectory: (options) => {
            return ipcRenderer.invoke('select-directory', options);
        },
        selectFile: (options) => {
            return ipcRenderer.invoke('select-file', options);
        },
        importApp: (asarPath) => {
            return ipcRenderer.invoke('import-app', asarPath);
        },
        packToAsar: (appDevItemStr) => {
            return ipcRenderer.invoke('pack-asar', appDevItemStr);
        },
        app: {
            info: (appItemJsonStr, fn) => {
                ipcRenderer.invoke('getAppInfo', appItemJsonStr).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ code: '9101', msg: error.message });
                });
            },
            all: (fn) => {
                fn(getAppList());
            },
            load: (appItemStr, devTag) => {
                ipcRenderer.send('loadApp', appItemStr, devTag);
            },
            clearData: (id, fn) => {
                ipcRenderer.invoke('clearAppData', id).then(result => {
                    fn(result);
                }).catch(error => {
                    console.error('IPC call failed:', error);
                    fn({ code: '9201', msg: error.message });
                });
            },
            remove: (param, fn) => {
                console.info('remove app param======', param);
                ipcRenderer.invoke('remove-app', param).then(() => {
                    fn({success: true, msg: '应用删除成功！'});
                }).catch(err => {
                    console.info('应用删除失败: ', err);
                    fn({success: false, msg: '应用删除失败！' + err.message});
                })
            }
        },
        appDev: {
            all: (fn) => ipcRenderer.invoke('getAppDevList').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            }),
            add: (fn) => ipcRenderer.invoke('handleAppAdd').then(result => fn(result)).catch(error => {
                console.error('IPC call failed:', error);
                fn(null);
            })
        }
    }
);

/**
 * @returns {*[Object]} app信息集合
 */
function getAppList() {
    // console.log('appsConfig.get('default'):', appsConfig.get('default'));
    if(undefined === AppsConfig.get('default')) {
        return [];
    }
    const /*Array<Types.AppItemType>*/ appInfoList = AppsConfig.get('default');
    let appList = [];
    for(const appInfo of appInfoList) {
        // /home/lizl6/.config/canbox/Users/apps.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\apps.json
        // 读取app.json文件内容
        const appJson = JSON.parse(fs.readFileSync(path.join(APP_PATH, appInfo.id + '.asar/app.json'), 'utf8'));
        const iconPath = path.join(APP_PATH, appInfo.id + '.asar', appJson.logo);
        console.info('iconPath: ', iconPath);
        const app = {
            id: appInfo.id,
            appJson: appJson,
            logo: iconPath,
            path: path.join(APP_PATH, appInfo.id + '.asar')
        };
        appList.push(app);
    }
    console.info('appList=====%o', appList);
    return appList;
}

/**
 * 获取当前开发中的app列表
 * @returns 获取一个json格式得app信息列表， 内容示例如下：
{
    "wrong": [
        {
            "id": "98e2dea8620745a0a49ea0dd205609da",
            "path": "/depot/cargo/demo-app/",
            "name": "test"
        }
    ],
    "correct": [
        {
            "id": "691e211238c141dcb6c00de4c0416349",
            "path": "C:\\Users\\brood\\depot\\cargo\\can-demo\\",
            "name": "demo",
            "appJson": {
                "name": "demo",
                "description": "这是一个插件demo",
                "author": "dev001",
                "homepage": "https://gitee.com/dev001/clipboard",
                "main": "index.html",
                "logo": "logo.png",
                "version": "0.0.6",
                "window": {
                    "minWidth": 600,
                    "minHeight": 400,
                    "width": 700,
                    "height": 500,
                    "resizable": false
                },
                "platform": [ "win32", "darwin", "linux" ],
                "categories": [ "utility" ],
                "tags": [ "demo" ]
            }
        }
    ]
}
 */

Types = function() {}
Types.AppItemType = function () {
    return {
        "name": "剪贴板",
        "id": "com.gitee.dev001.clipboard",
        "description": "一个好用的剪贴板",
        "author": "dev001",
        "homepage": "https://gitee.com/dev001/clipboard",
        "main": "index.html",
        "logo": "logo.png",
        "version": "0.0.6",
        "window": {
            "minWidth": 800,
            "minHeight": 400,
            "width": 900,
            "height": 500,
            "icon": "logo.png",
            "resizable": false,
            "webPreferences": {
                "preload": "preload.js"
            }
        },
        "platform": ["win32", "darwin", "linux"],
        "categories": ["development", "utility"],
        "tags": ["json", "jsonformatter"],
        "development": {
            "main": "index.html",
            "devTools": "detach"
        }
    };
}