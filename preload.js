const { contextBridge, ipcRenderer, shell } = require('electron');
const Store  = require('electron-store');
// const fs = require("fs");
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
    let extIdList = extensionsConfig.get('default'), extList = [];
    for(let id of extIdList) {
        // extensions[id] = require(`./extensions/${id}/main`);
        const currentStore = new Store({
            cwd: 'Users/default/' + id,
            name: 'plugin'
        });
        // console.info(currentStore.path);
        // C:\Users\brood\AppData\Roaming\canbox\Users\default\93f62daede2f64f962bec7fec070fb41\plugin.json
        const ext = {
            'id': id,
            'plugin': currentStore.store,
            'path': currentStore.path.substring(0, currentStore.path.lastIndexOf('plugin.json'))
        };
        extList.push(ext);
    }
    // console.info('returnList=====%o', returnList);
    return extList;
}