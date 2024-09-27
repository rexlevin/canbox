const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
const path = require('path')
const fs = require("fs");
const package = require('./package.json');

const appsConfig = new Store({
    cwd: 'Users',
    name: 'apps'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

ipcRenderer.on('loadAppDirect', (e, appId) => {
    console.info('loadAppDirect: %s',appId);
    for(let appItem of getAppList()) {
        if(appItem.id === appId) {
            ipcRenderer.send('loadExt', JSON.stringify(appItem));
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
        }
    }
);

function getAppList() {
    // console.log("extension===%o", extensionsConfig.get('default'));
    let appInfoList = appsConfig.get('default'), extList = [];
    for(let appInfo of appInfoList) {
        // console.info('===%s', appConfig.path);
        // /home/lizl6/.config/canbox/Users/apps.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\apps.json
        let defaultPath = appsConfig.path.substring(0, appsConfig.path.lastIndexOf('apps.json'));
        const plugin = JSON.parse(fs.readFileSync(path.join(defaultPath, 'default', appInfo.id + '.asar/plugin.json'), 'utf8'));
        // const plugin = JSON.parse(fs.readFileSync(defaultPath + 'default/' + extInfo.id + '.asar/plugin.json'));
        const ext = {
            'id': appInfo.id,
            'plugin': plugin,
            'path': path.join(defaultPath, 'default', appInfo.id + '.asar')
        };
        extList.push(ext);
    }
    // console.info('returnList=====%o', extList);
    return extList;
}