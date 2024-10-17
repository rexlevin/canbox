const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
const path = require('path')
const fs = require("fs");
const uuid = require('uuid');
const package = require('./package.json');

const appsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

const appsDevConfig = new Store({
    cwd: 'Users',
    name: 'appsDev'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
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
        generateShortcut: () => {
            // console.info(getExtList());
            ipcRenderer.send('generateStartupShortcut', JSON.stringify(getAppList()));
        },
        openUrl: (url) => {
            console.info('url====', url);
            ipcRenderer.send('open-url', url);
        },
        app: {
            info: (appItemJsonStr, fn) => {
                const appItem = JSON.parse(appItemJsonStr);
                // console.info('appItem==', appItem);
                fs.readFile(path.join(appItem.path, 'README.md'), 'utf8', (err, content) => {
                    if(err) {
                        if(err.code === 'ENOENT') {
                            console.error('file note found: ', err.path);
                        } else {
                            console.error('read file error: ', err.path);
                        }
                        fn({'code': '9101', 'data': 'There is no introduction information of this app'});
                        return;
                    }
                    // console.info(content)
                    fn({'code': '0000', 'data': content});
                });
            },
            all: (fn) => {
                fn(getAppList());
            },
            load: (appDevItem) => {
                ipcRenderer.send('loadApp', appDevItem);
            }
        },
        appDev: {
            info: (appDevItemJsonStr, fn) => {
                const appDevItem = JSON.parse(appDevItemJsonStr);
                // console.info('appDevItem==', appDevItem);
                fs.readFile(path.join(appDevItem.path, 'README.md'), 'utf8', (err, content) => {
                    if(err) {
                        if(err.code === 'ENOENT') {
                            console.error('file note found: ', err.path);
                        } else {
                            console.error('read file error: ', err.path);
                        }
                        fn({'code': '9101', 'data': 'There is no introduction information of this app'});
                        return;
                    }
                    // console.info(content)
                    fn({'code': '0000', 'data': content});
                });
            },
            load: (appDevItem) => {
                ipcRenderer.send('loadApp', appDevItem);
            },
            all: (fn) => {
                fn(getAppDevList());
            },
            add: (fn) => {
                // console.info(uuid.v1());
                const options = {
                    title: '选择你的 app.json 文件',
                    filters: [
                        { name: 'app.json', extensions: ['json'] }
                    ],
                    properties: ['openFile']
                };
                ipcRenderer.send('openAppJson', options);
                ipcRenderer.on('openAppJson-reply', (e, filePath) => {
                    if('' == filePath) return;
                    // 这里开始读取filePaht的文件内容
                    let appJson = fs.readFileSync(filePath, 'utf-8');
                    appJson = JSON.parse(appJson);
                    // e.sender.send('openAppJsonResult', appJson);
                    const appDevConfig = {
                        id: uuid.v4().replace(/-/g, ''),
                        path: filePath.substring(0, filePath.lastIndexOf('app.json')),
                        name: appJson.name
                    };
                    let appDevConfigArr = undefined == appsDevConfig.get('default')
                        ? [] : appsDevConfig.get('default');
                    appDevConfigArr.unshift(appDevConfig);
                    appsDevConfig.set('default', appDevConfigArr);
                    fn(getAppDevList());
                });
            },
            remove: (id, fn) => {
                console.info('id======', id);
                removeAppDevById(id);
                fn({'code': '0000'});
            }
        }
    }
);

function removeAppDevById(id) {
    if(undefined === appsDevConfig.get('default')) {
        return;
    }
    let appDevInfoList = appsDevConfig.get('default');
    for(let appDevInfo of appDevInfoList) {
        console.info('appDevInfo', appDevInfo);
        if(id != appDevInfo.id) continue;
        appDevInfoList.splice(appDevInfoList.indexOf(appDevInfo), 1);
        appsDevConfig.set('default', appDevInfoList);
    }
    console.info('%s===remove is success', id);
}

function getAppList() {
    // console.log('appsConfig===%o', appsConfig.get('default'));
    // console.info(2, appsConfig.get('default'));
    if(undefined === appsConfig.get('default')) {
        return [];
    }
    let appInfoList = appsConfig.get('default'), appList = [];
    for(let appInfo of appInfoList) {
        // /home/lizl6/.config/canbox/Users/apps.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\apps.json
        let defaultPath = appsConfig.path.substring(0, appsConfig.path.lastIndexOf('apps.json'));
        const appJson = JSON.parse(fs.readFileSync(path.join(defaultPath, 'default', appInfo.id + '.asar/app.json'), 'utf8'));
        // const appJson = JSON.parse(fs.readFileSync(defaultPath + 'default/' + extInfo.id + '.asar/spp.json'));
        const app = {
            'id': appInfo.id,
            'appJson': appJson,
            'path': path.join(defaultPath, 'default', appInfo.id + '.asar')
        };
        appList.push(app);
    }
    // console.info('appList=====%o', appList);
    return appList;
}

/**
 * 获取当前开发中的app列表
 * @returns 
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
    if(undefined === appsDevConfig.get('default')) {
        return [];
    }
    let appDevInfoList = appsDevConfig.get('default')
        , appDevList = []
        , appDevFalseList = []
        , tmpItem = {};
    for(let appDevInfo of appDevInfoList) {
        // console.info('appDevInfo', appDevInfo);
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
            tmpItem = objClone(appDevInfo);
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
        appsDevConfig.set('default', appDevInfoList);
    }
    // console.info('appDevInfoList===', appDevInfoList);
    // console.info('appDevList=====%o', appDevList);
    return {"correct": appDevList, "wrong": appDevFalseList};
}

function objClone(obj) {
    let copy

    // 处理3种基础类型，和null、undefined
    if (obj === null || typeof obj !== 'object') return obj

    // 处理日期
    if (obj instanceof Date) {
        copy = new Date()
        copy.setTime(obj.getTime())
        return copy
    }

    // 处理数组
    if (Array instanceof Array) {
        copy = []
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = objClone(obj[i])
        }
        return copy
    }

    // 处理函数
    if (obj instanceof Function) {
        copy = function () {
            return obj.apply(this, arguemnts)
        }
        return copy
    }

    // 处理对象
    if (obj instanceof Object) {
        copy = {}
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = objClone(obj[attr])
        }
        return copy
    }

    throw new Error("Unable to copy obj as type isn't suported" + obj.constructor.name)
}
