const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
const path = require('path')
const fs = require("fs");
const package = require('./package.json');

const extensionsConfig = new Store({
    cwd: 'Users',
    name: 'extensions'
});

window.addEventListener('DOMContentLoaded', () => {
    document.title = package.description + ' - v' + package.version;
});

ipcRenderer.on('loadExtDirect', (e, extId) => {
    console.info('loadExtDirect: %s',extId);
    for(let appItem of getExtList()) {
        if(appItem.id === extId) {
            ipcRenderer.send('loadExt', JSON.stringify(appItem));
        }
    }
});

contextBridge.exposeInMainWorld(
    "api", {
        generateShortcut: () => {
            // console.info(getExtList());
            ipcRenderer.send('generateStartupShortcut', JSON.stringify(getExtList()));
        },
        getExtensionList: () => {
            return getExtList();
        },
        loadExt: (appItem) => {
            ipcRenderer.send('loadExt', appItem);
        }
    }
);

function getExtList() {
    // console.log("extension===%o", extensionsConfig.get('default'));
    let extInfoList = extensionsConfig.get('default'), extList = [];
    for(let extInfo of extInfoList) {
        // console.info('===%s', extensionsConfig.path);
        // /home/lizl6/.config/canbox/Users/extensions.json
        // C:\Users\brood\AppData\Roaming\canbox\Users\extensions.json
        let defaultPath = extensionsConfig.path.substring(0, extensionsConfig.path.lastIndexOf('extensions.json'));
        const plugin = JSON.parse(fs.readFileSync(path.join(defaultPath, 'default', extInfo.id + '.asar/plugin.json'), 'utf8'));
        // const plugin = JSON.parse(fs.readFileSync(defaultPath + 'default/' + extInfo.id + '.asar/plugin.json'));
        const ext = {
            'id': extInfo.id,
            'plugin': plugin,
            'path': path.join(defaultPath, 'default', extInfo.id + '.asar')
        };
        extList.push(ext);
    }
    // console.info('returnList=====%o', extList);
    return extList;
}