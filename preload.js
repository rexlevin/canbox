const { contextBridge, ipcRenderer, shell, dialog } = require('electron');
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
        appList: () => {
            return getAppList();
        },
        loadApp: (appItem) => {
            ipcRenderer.send('loadApp', appItem);
        },
        appDev: {
            load: (appDevItem) => {
                ipcRenderer.send('loadApp', appDevItem);
            },
            all: () => {
                return getAppDevList();
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
                    console.info('openAppJson-reply: %s', filePath);
                    if('' == filePath) return;
                    // 这里开始读取filePaht的文件内容
                    let appJson = fs.readFileSync(filePath, 'utf-8');
                    appJson = JSON.parse(appJson);
                    console.info(2, appJson);
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
    "false": [
        {
            "id": "98e2dea8620745a0a49ea0dd205609da",
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
        , appDevList = [];
    for(let appDevInfo of appDevInfoList) {
        try {
            const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
            appDevInfo.appJson = appJson;
            appDevList.push(appDevInfo);
        } catch(e) {
            console.error('parse app.json error:', e);
            continue;
        }
    }
    console.info('appDevList=====%o', appDevList);
    return appDevList;
}