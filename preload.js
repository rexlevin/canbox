const { contextBridge, ipcRenderer } = require('electron');
// const { BrowserWindow } = require('@electron/remote');
const Store  = require('electron-store');
const path = require('path')
const fs = require("fs");
const uuid = require('uuid');
const PackageJson = require('./package.json');
const ObjectUtils = require('./modules/utils/ObjectUtils')

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
                const appItem = JSON.parse(appItemJsonStr);
                // console.info('appItem==', appItem);
                fs.readFile(path.join(appItem.path, 'README.md'), 'utf8', (err, content) => {
                    if(err) {
                        let msg;
                        if(err.code === 'ENOENT') {
                            console.error('file note found: ', err.path);
                            msg = '文件不存在';
                        } else {
                            console.error('read file error: ', err.path);
                            msg = '文件读取失败';
                        }
                        fn({code: '9101', msg: msg, data: 'There is no introduction information of this app'});
                        return;
                    }
                    // console.info(content)
                    fn({code: '0000', data: content});
                });
            },
            all: (fn) => {
                fn(getAppList());
            },
            load: (appItemStr, devTag) => {
                ipcRenderer.send('loadApp', appItemStr, devTag);
            },
            clearData: (id, fn) => {
                console.info('clearData');
                const appData = path.join( USER_DATA_PATH, 'Users', 'data', id );

                // 判断有没有appData这个目录，有的话才进行删除操作
                fs.access(appData, fs.constants.F_OK, (err) => {
                    if (err) {
                        console.error(`Directory does not exist: ${err}`);
                        fn({code: '0000', msg: 'no data to remove'});
                        return;
                    }
                    fs.rmdir(appData, { recursive: true }, (error) => {
                        if (error) {
                            console.error(`Failed to remove directory: ${error}`);
                            fn({code: '9201', msg: error.message, 'data': 'Failed to remove app data'});
                            return;
                        }
                        fn({code: '0000'});
                    })
                })
            },
            remove: (param, fn) => {
                console.info('remove app param======', param);
                if ('dev' === param.tag) {
                    removeAppDevById(param.id);
                } else {
                    removeAppById(param.id);
                }
                fn({code: '0000'});
            }
        },
        appDev: {
            // info: (appDevItemJsonStr, fn) => {
            //     const appDevItem = JSON.parse(appDevItemJsonStr);
            //     // console.info('appDevItem==', appDevItem);
            //     fs.readFile(path.join(appDevItem.path, 'README.md'), 'utf8', (err, content) => {
            //         if(err) {
            //             let msg = '';
            //             if(err.code === 'ENOENT') {
            //                 console.error('file note found: ', err.path);
            //                 msg = '文件不存在';
            //             } else {
            //                 console.error('read file error: ', err.path);
            //                 msg = '文件读取失败';
            //             }
            //             fn({
            //                 code: '9202',
            //                 msg: msg,
            //                 data: 'There is no introduction information of this app'
            //             });
            //             return;
            //         }
            //         // console.info(content)
            //         fn({code: '0000', data: content});
            //     });
            // },
            all: (fn) => {
                fn(getAppDevList());
            },
            // load: (appDevItem) => {
            //     // ipcRenderer.send('loadApp', appDevItem, '1');
            //     // loadApp(appDevItem, '1')
            //     AppWindow.loadApp(appDevItem, '1');
            // },
            add: (fn) => {
                // console.info(uuid.v1());
                const options = {
                    title: '选择你的 app.json 文件',
                    filters: [
                        { name: 'app.json', extensions: ['json'] }
                    ],
                    properties: ['openFile']
                };
                // 向 main 发送同步消息
                const filePath = ipcRenderer.sendSync('openAppJson', options);
                console.info('filePath: ', filePath);
                if('' === filePath) return;
                // 这里开始读取filePath的文件内容
                let appJson = fs.readFileSync(filePath, 'utf-8');
                appJson = JSON.parse(appJson);
                // e.sender.send('openAppJsonResult', appJson);
                const appDevConfig = {
                    id: uuid.v4().replace(/-/g, ''),
                    path: filePath.substring(0, filePath.lastIndexOf('app.json')),
                    name: appJson.name
                };
                let appDevConfigArr = undefined === AppsDevConfig.get('default')
                    ? [] : AppsDevConfig.get('default');
                console.info('appDevConfigArr', appDevConfigArr);
                appDevConfigArr.unshift(appDevConfig);
                AppsDevConfig.set('default', appDevConfigArr);
                fn(getAppDevList());
            }
        }
    }
);

function removeAppById(id) {
    if(undefined === AppsConfig.get('default')) {
        return;
    }
    const /*Array<Object>*/ appConfigList = AppsConfig.get('default');
    for(let appConfig of appConfigList) {
        console.info('appConfig==', appConfig);
        if(id !== appConfig.id) continue;
        appConfigList.splice(appConfigList.indexOf(appConfig), 1);
        AppsConfig.set('default', appConfigList);
    }
    fs.unlinkSync(path.join(APP_PATH, id + '.asar'));
    console.info('%s===remove is success', id);
}
function removeAppDevById(id) {
    if(undefined === AppsDevConfig.get('default')) {
        return;
    }
    const /*Array<Object>*/ appDevInfoList = AppsDevConfig.get('default');
    for(let appDevInfo of appDevInfoList) {
        console.info('appDevInfo', appDevInfo);
        if(id !== appDevInfo.id) continue;
        appDevInfoList.splice(appDevInfoList.indexOf(appDevInfo), 1);
        AppsDevConfig.set('default', appDevInfoList);
    }
    console.info('%s===remove is success', id);
}

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
function getAppDevList() {
    // console.info(1,appsDevConfig);
    // console.info('getAppDevList===', appsDevConfig.get('default'));
    if(undefined === AppsDevConfig.get('default')) {
        return [];
    }
    let /*Array<Types.AppItemType>*/ appDevInfoList = AppsDevConfig.get('default')
        , appDevList = []
        , appDevFalseList = []
        , tmpItem = {};
    for(let appDevInfo of appDevInfoList) {
        // console.info('appDevInfo', appDevInfo);
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
            tmpItem = ObjectUtils.clone(appDevInfo);
            tmpItem.appJson = appJson;
            appDevList.push(tmpItem);
        } catch(e) {
            // console.error('parse app.json error:', e);
            appDevFalseList.push(appDevInfo);
        }
    }
    if(appDevFalseList.length > 0) {
        for(let falseItem of appDevFalseList) {
            console.info(falseItem);
            appDevInfoList = appDevInfoList.filter(item => item.id !== falseItem.id);
        }
        AppsDevConfig.set('default', appDevInfoList);
    }
    // console.info('appDevInfoList===', appDevInfoList);
    // console.info('appDevList=====%o', appDevList);
    return {"correct": appDevList, "wrong": appDevFalseList};
}

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