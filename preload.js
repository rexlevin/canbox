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

// ipcRenderer.on('openAppJson-reply', (e, filePath) => {
//     console.info('openAppJson-reply: %s', filePath);
// });

contextBridge.exposeInMainWorld(
    "api", {
        generateShortcut: () => {
            // console.info(getExtList());
            ipcRenderer.send('generateStartupShortcut', JSON.stringify(getAppList()));
        },
        appList: () => {
            return getAppList();
        },
        appDevList: () => {
            return getAppDevList();
        },
        loadApp: (appItem) => {
            ipcRenderer.send('loadApp', appItem);
        },
        openAppJson: (fn) => {
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
                    path: filePath.substring(0, filePath.lastIndexOf('/')),
                    name: appJson.name
                };
                let appDevConfigArr = undefined == appsDevConfig.get('default')
                    ? [] : appsDevConfig.get('default');
                appDevConfigArr.unshift(appDevConfig);
                appsDevConfig.set('default', appDevConfigArr);
                fn(appDevConfig);
            });
        }
    }
);

function getAppList() {
    // console.log("extension===%o", extensionsConfig.get('default'));
    let appInfoList = appsConfig.get('default'), appList = [];
    for(let appInfo of appInfoList) {
        // console.info('===%s', appConfig.path);
        // /home/lizl6/.config/canbox/Users/apps.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\apps.json
        let defaultPath = appsConfig.path.substring(0, appsConfig.path.lastIndexOf('/'));
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

function getAppDevList() {
    let appDevInfoList = appsDevConfig.get('default')
        , appDevList = [];
    for(let appDevInfo of appDevInfoList) {
        const appJson = JSON.parse(fs.readFileSync(path.join(appDevInfo.path, 'app.json'), 'utf8'));
        appDevInfo.appJson = appJson;
        appDevList.push(appDevInfo);
    }
    console.info('appDevList=====%o', appDevList);
    return appDevList;
}